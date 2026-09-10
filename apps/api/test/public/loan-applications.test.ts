import { describe, expect, it } from "vitest";

import { appRouter } from "../../src/router.js";
import {
  approvalInput,
  CapturingLogger,
  createTestContext,
  InMemoryLoanRepository,
  supportAgent,
  underwriter,
} from "../support/in-memory-repository.js";

describe("loan application public examples", () => {
  it("returns the seeded pending application for review", async () => {
    const caller = appRouter.createCaller(createTestContext());

    const result = await caller.loanApplications.getForReview({ applicationId: "app-pending" });

    expect(result).toMatchObject({
      id: "app-pending",
      status: "PENDING_REVIEW",
      requestedAmountMinor: 500_000,
      customer: { fullName: "Olena Kovalenko" },
    });
    expect(result.customer).not.toHaveProperty("nationalId");
  });

  it("approves an eligible application", async () => {
    const repository = new InMemoryLoanRepository();
    const caller = appRouter.createCaller(createTestContext(repository));

    const result = await caller.loanApplications.decide(approvalInput());

    expect(result).toMatchObject({
      applicationId: "app-pending",
      status: "APPROVED",
      approvedAmountMinor: 400_000,
    });
    expect(repository.audits).toHaveLength(1);
  });

  it("rejects an application without an approved amount", async () => {
    const repository = new InMemoryLoanRepository();
    const caller = appRouter.createCaller(createTestContext(repository));

    const result = await caller.loanApplications.decide({
      applicationId: "app-pending",
      decision: "REJECTED",
      reason: "The submitted income cannot be verified",
    });

    expect(result.status).toBe("REJECTED");
    expect(result.approvedAmountMinor).toBeNull();
  });

  it("forbids a support user from recording a decision", async () => {
    const repository = new InMemoryLoanRepository();
    const caller = appRouter.createCaller(createTestContext(repository, supportAgent));

    await expect(caller.loanApplications.decide(approvalInput())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(repository.application.status).toBe("PENDING_REVIEW");
    expect(repository.application.approvedAmountMinor).toBeNull();
    expect(repository.audits).toHaveLength(0);
  });

  it("surfaces NOT_FOUND for an application that does not exist", async () => {
    const caller = appRouter.createCaller(createTestContext());

    await expect(
      caller.loanApplications.decide(approvalInput({ applicationId: "app-missing" })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("surfaces CONFLICT when the application was already decided", async () => {
    const repository = new InMemoryLoanRepository();
    const caller = appRouter.createCaller(createTestContext(repository));
    await caller.loanApplications.decide(approvalInput());

    await expect(caller.loanApplications.decide(approvalInput())).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("surfaces BAD_REQUEST when the amount exceeds the requested amount", async () => {
    const caller = appRouter.createCaller(createTestContext());

    await expect(
      caller.loanApplications.decide(approvalInput({ approvedAmountMinor: 600_000 })),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reports an unexpected failure as INTERNAL_SERVER_ERROR and logs the cause", async () => {
    const repository = new InMemoryLoanRepository();
    const logger = new CapturingLogger();
    repository.failNextAudit = true;
    const caller = appRouter.createCaller(createTestContext(repository, underwriter, logger));

    await expect(caller.loanApplications.decide(approvalInput())).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });

    expect(logger.errors).toHaveLength(1);
    expect(logger.errors[0]?.context.error).toBeInstanceOf(Error);
  });

  it("rejects an obviously empty reason at the input boundary", async () => {
    const caller = appRouter.createCaller(createTestContext());

    await expect(
      caller.loanApplications.decide(approvalInput({ reason: "" })),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
