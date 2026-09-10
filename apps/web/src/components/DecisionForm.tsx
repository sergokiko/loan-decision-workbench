"use client";

import { useId, useState, type FormEvent } from "react";

import { formatMinorUnits, parseMinorUnits } from "@/lib/money";

export interface DecisionFormValue {
  decision: "APPROVED" | "REJECTED";
  approvedAmountMinor?: number;
  reason: string;
}

interface DecisionFormProps {
  requestedAmountMinor: number;
  disabled?: boolean;
  onSubmit(value: DecisionFormValue): Promise<void> | void;
}

export function DecisionForm({
  requestedAmountMinor,
  disabled = false,
  onSubmit,
}: DecisionFormProps) {
  const [decision, setDecision] = useState<DecisionFormValue["decision"]>("APPROVED");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const amountErrorId = useId();
  const reasonErrorId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedReason = reason.trim();
    const nextReasonError = trimmedReason ? null : "Enter a reason for this decision.";

    // parseMinorUnits is string-based on purpose. The float path this replaces
    // rounded 1.005 to 100 minor units instead of 101, and turned "" into 0.
    const parsedAmount = decision === "APPROVED" ? parseMinorUnits(approvedAmount) : null;
    let nextAmountError: string | null = null;

    if (decision === "APPROVED") {
      if (parsedAmount === null) {
        nextAmountError = "Enter an amount in euros, using at most two decimal places.";
      } else if (parsedAmount <= 0) {
        nextAmountError = "The approved amount must be greater than zero.";
      } else if (parsedAmount > requestedAmountMinor) {
        nextAmountError = `The approved amount cannot exceed ${formatMinorUnits(requestedAmountMinor)}.`;
      }
    }

    setReasonError(nextReasonError);
    setAmountError(nextAmountError);

    if (nextReasonError || nextAmountError) {
      return;
    }

    setSubmitting(true);
    try {
      const value: DecisionFormValue =
        decision === "APPROVED" && parsedAmount !== null
          ? { decision, approvedAmountMinor: parsedAmount, reason: trimmedReason }
          : { decision, reason: trimmedReason };
      await onSubmit(value);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="decision-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <fieldset disabled={disabled || submitting}>
        <legend>Decision</legend>
        <label className="radio-row">
          <input
            checked={decision === "APPROVED"}
            name="decision"
            onChange={() => setDecision("APPROVED")}
            type="radio"
            value="APPROVED"
          />
          Approve
        </label>
        <label className="radio-row">
          <input
            checked={decision === "REJECTED"}
            name="decision"
            onChange={() => setDecision("REJECTED")}
            type="radio"
            value="REJECTED"
          />
          Reject
        </label>

        {decision === "APPROVED" ? (
          <label>
            Approved amount in euros
            <span className="input-affix">
              <span aria-hidden="true" className="euro-label">
                €
              </span>
              <input
                aria-describedby={amountError ? amountErrorId : undefined}
                aria-invalid={amountError ? true : undefined}
                className="amount-input"
                inputMode="decimal"
                onChange={(event) => setApprovedAmount(event.target.value)}
                type="text"
                value={approvedAmount}
              />
            </span>
            {amountError ? (
              <span className="field-error" id={amountErrorId} role="alert">
                {amountError}
              </span>
            ) : null}
          </label>
        ) : null}

        <label>
          Reason
          <textarea
            aria-describedby={reasonError ? reasonErrorId : undefined}
            aria-invalid={reasonError ? true : undefined}
            maxLength={1_000}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            value={reason}
          />
          {reasonError ? (
            <span className="field-error" id={reasonErrorId} role="alert">
              {reasonError}
            </span>
          ) : null}
        </label>

        <button className="primary-button" type="submit">
          {submitting ? "Saving…" : "Record decision"}
        </button>
      </fieldset>
    </form>
  );
}
