/**
 * Parses a major-unit amount ("1250.50") into integer minor units (125050).
 *
 * Deliberately string-based. `Math.round(Number(value) * 100)` goes through
 * binary floating point first, so `1.005 * 100` is `100.49999999999999` and
 * rounds to 100 instead of 101; `4.015` gives 401 instead of 402. It also
 * accepts values a money field should refuse: `Number("")` is 0, `Number("1e5")`
 * is 100000, and more than two decimals are silently rounded away.
 *
 * Returns null for anything that is not a well-formed amount, so the caller can
 * report it rather than submitting a wrong number.
 */
export function parseMinorUnits(value: string): number | null {
  const match = /^\s*(\d{1,12})(?:\.(\d{1,2}))?\s*$/.exec(value);

  if (!match?.[1]) {
    return null;
  }

  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Formats integer minor units for display. */
export function formatMinorUnits(minor: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(minor / 100);
}
