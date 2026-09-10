import cors from "@fastify/cors";
import { prisma } from "@loan-review/db";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";

import type { RequestContext, UserRole } from "./domain.js";
import { PrismaLoanRepository } from "./repository.js";
import { appRouter } from "./router.js";

const server = Fastify({
  logger: true,
  routerOptions: { maxParamLength: 5_000 },
});
const repository = new PrismaLoanRepository(prisma);

await server.register(cors, {
  origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  credentials: true,
});

// Liveness: the process is up. Deliberately does not touch the database, so a
// slow database cannot get the container killed.
server.get("/health", async () => ({ status: "ok" }));

// Readiness: only report ready when the database is actually reachable.
server.get("/ready", async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ready" };
  } catch (error: unknown) {
    server.log.error(error, "Readiness check failed");
    return reply.code(503).send({ status: "unavailable" });
  }
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext({ req }: CreateFastifyContextOptions): RequestContext {
      const roleHeader = req.headers["x-user-role"];
      const role: UserRole = roleHeader === "SUPPORT" ? "SUPPORT" : "UNDERWRITER";
      return {
        repository,
        session: {
          user: {
            id: req.headers["x-user-id"]?.toString() ?? "user-underwriter-1",
            name: "Development User",
            role,
          },
        },
        logger: {
          info(context, message) {
            server.log.info(context, message);
          },
          error(context, message) {
            server.log.error(context, message);
          },
        },
      };
    },
  },
});

// F23: API_PORT is declared in .env.example, turbo.json and the devcontainer,
// but the port was hardcoded.
const port = Number(process.env.API_PORT ?? 4000);

if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  server.log.error({ apiPort: process.env.API_PORT }, "API_PORT is not a valid port");
  process.exit(1);
}

// F24: without this, a deploy severs in-flight decisions and leaks the pool.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void (async () => {
      server.log.info({ signal }, "Shutting down");
      try {
        await server.close();
        await prisma.$disconnect();
        process.exit(0);
      } catch (error: unknown) {
        server.log.error(error, "Shutdown failed");
        process.exit(1);
      }
    })();
  });
}

try {
  await server.listen({ port, host: "0.0.0.0" });
} catch (error: unknown) {
  server.log.error(error);
  process.exit(1);
}
