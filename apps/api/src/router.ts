import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

import type {
  DecideLoanApplicationInput,
  LoanApplicationRecord,
  LoanApplicationView,
  RequestContext,
} from "./domain.js";

const t = initTRPC.context<RequestContext>().create({
  transformer: superjson,
  // An unexpected failure must not leak its message or stack to the client.
  // Expected domain errors keep their message so the UI can act on them.
  errorFormatter({ shape, error }) {
    const data = { ...shape.data };
    delete data.stack;
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return { ...shape, message: "Something went wrong. Please try again.", data };
    }
    return { ...shape, data };
  },
});

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const underwriterProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== "UNDERWRITER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an underwriter may record a loan decision",
    });
  }
  return next({ ctx });
});

export const decideLoanApplicationSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  approvedAmountMinor: z.number().optional(),
  reason: z.string().min(1),
});

function toView(application: LoanApplicationRecord): LoanApplicationView {
  return {
    id: application.id,
    status: application.status,
    requestedAmountMinor: application.requestedAmountMinor,
    approvedAmountMinor: application.approvedAmountMinor,
    customer: {
      fullName: application.customer.fullName,
      lastName: application.customer.lastName,
      gender: application.customer.gender,
      taxId: application.customer.taxId,
      email: application.customer.email,
    },
  };
}

export const appRouter = t.router({
  loanApplications: t.router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const applications = await ctx.repository.listApplications();
      return applications.map(toView);
    }),

    getForReview: protectedProcedure
      .input(z.object({ applicationId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const application = await ctx.repository.findApplication(input.applicationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        return toView(application);
      }),

    decide: underwriterProcedure
      .input(decideLoanApplicationSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const application = await ctx.repository.findApplication(input.applicationId);
          if (!application) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
          }

          ctx.logger.info(
            { input, application, user: ctx.session.user },
            "Processing loan decision",
          );

          if (application.status !== "PENDING_REVIEW") {
            throw new TRPCError({ code: "CONFLICT", message: "Application already decided" });
          }

          validateBusinessRules(application, input);

          const updated = await ctx.repository.updateApplication(
            application.id,
            input.decision,
            input.approvedAmountMinor ?? null,
          );

          await ctx.repository.createAudit({
            applicationId: application.id,
            actorId: ctx.session.user.id,
            previousStatus: application.status,
            newStatus: input.decision,
            approvedAmountMinor: input.approvedAmountMinor ?? null,
            reason: input.reason,
          });

          const response = {
            applicationId: updated.id,
            status: input.decision,
            approvedAmountMinor: updated.approvedAmountMinor,
          };

          return response;
        } catch (error: unknown) {
          // Domain errors are the answer, not a failure: pass them through.
          if (error instanceof TRPCError) {
            throw error;
          }

          ctx.logger.error(
            {
              applicationId: input.applicationId,
              actorId: ctx.session.user.id,
              decision: input.decision,
              error,
            },
            "Loan decision failed unexpectedly",
          );

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Decision failed",
            cause: error,
          });
        }
      }),
  }),
});

function validateBusinessRules(
  application: LoanApplicationRecord,
  input: DecideLoanApplicationInput,
): void {
  if (!input.reason.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A reason is required" });
  }

  if (input.decision === "APPROVED") {
    if (
      input.approvedAmountMinor === undefined ||
      !Number.isInteger(input.approvedAmountMinor) ||
      input.approvedAmountMinor > application.requestedAmountMinor
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid approved amount" });
    }
  } else if (input.approvedAmountMinor !== undefined) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Rejection cannot have an amount" });
  }
}

export type AppRouter = typeof appRouter;
