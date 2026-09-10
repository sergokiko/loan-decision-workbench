import {
  LoanApplicationStatus as PrismaLoanApplicationStatus,
  type PrismaClient,
} from "@loan-review/db";

import type {
  AuditRecordInput,
  LoanApplicationRecord,
  LoanApplicationStatus,
  LoanDecision,
  LoanRepository,
} from "./domain.js";

// Exhaustive by construction: adding a status to the Prisma enum without
// mapping it here becomes a compile error rather than a silent bad cast.
const DOMAIN_STATUS: Record<PrismaLoanApplicationStatus, LoanApplicationStatus> = {
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

function toDomainStatus(status: PrismaLoanApplicationStatus): LoanApplicationStatus {
  const mapped = DOMAIN_STATUS[status];
  if (!mapped) {
    throw new Error(`Unmapped loan application status: ${status}`);
  }
  return mapped;
}

function toRecord(application: {
  id: string;
  status: PrismaLoanApplicationStatus;
  requestedAmountMinor: number;
  approvedAmountMinor: number | null;
  customerFullName: string;
  customerLastName: string;
  customerGender: string;
  customerTaxId: string;
  customerEmail: string;
  customerPhone: string;
  customerNationalId: string;
  monthlyIncomeMinor: number;
}): LoanApplicationRecord {
  return {
    id: application.id,
    status: toDomainStatus(application.status),
    requestedAmountMinor: application.requestedAmountMinor,
    approvedAmountMinor: application.approvedAmountMinor,
    customer: {
      fullName: application.customerFullName,
      lastName: application.customerLastName,
      gender: application.customerGender,
      taxId: application.customerTaxId,
      email: application.customerEmail,
      phone: application.customerPhone,
      nationalId: application.customerNationalId,
      monthlyIncomeMinor: application.monthlyIncomeMinor,
    },
  };
}

export class PrismaLoanRepository implements LoanRepository {
  constructor(private readonly client: PrismaClient) {}

  async findApplication(id: string): Promise<LoanApplicationRecord | null> {
    const application = await this.client.loanApplication.findUnique({ where: { id } });
    return application ? toRecord(application) : null;
  }

  async listApplications(): Promise<LoanApplicationRecord[]> {
    const applications = await this.client.loanApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    return applications.map(toRecord);
  }

  async updateApplication(
    id: string,
    decision: LoanDecision,
    approvedAmountMinor: number | null,
  ): Promise<LoanApplicationRecord> {
    const application = await this.client.loanApplication.update({
      where: { id },
      data: {
        status:
          decision === "APPROVED"
            ? PrismaLoanApplicationStatus.APPROVED
            : PrismaLoanApplicationStatus.REJECTED,
        approvedAmountMinor,
      },
    });
    return toRecord(application);
  }

  async createAudit(input: AuditRecordInput): Promise<void> {
    await this.client.loanDecisionAudit.create({
      data: {
        applicationId: input.applicationId,
        actorId: input.actorId,
        previousStatus: input.previousStatus as PrismaLoanApplicationStatus,
        newStatus: input.newStatus as PrismaLoanApplicationStatus,
        approvedAmountMinor: input.approvedAmountMinor,
        reason: input.reason,
      },
    });
  }
}
