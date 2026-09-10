import { describe, expect, it } from "vitest";

import { parseMinorUnits } from "../../src/lib/money";

describe("parseMinorUnits", () => {
  it.each([
    ["1250.50", 125_050],
    ["1250.5", 125_050],
    ["1250", 125_000],
    ["0.07", 7],
    ["0.01", 1],
    ["  42.42  ", 4242],
  ])("parses %s as %i minor units", (input, expected) => {
    expect(parseMinorUnits(input)).toBe(expected);
  });

  it.each([
    ["1.005", "Math.round(1.005 * 100) is 100, not 101"],
    ["4.015", "Math.round(4.015 * 100) is 401, not 402"],
    ["10.005", "silently rounded away by the float path"],
  ])("refuses %s rather than rounding it (%s)", (input) => {
    expect(parseMinorUnits(input)).toBeNull();
  });

  it.each([
    ["", "Number('') is 0"],
    ["   ", "whitespace"],
    ["abc", "not a number"],
    ["1e5", "Number('1e5') is 100000"],
    ["-5", "negative"],
    ["1,250.50", "grouping separator"],
    ["1.2.3", "malformed"],
    ["Infinity", "non-finite"],
  ])("rejects %s (%s)", (input) => {
    expect(parseMinorUnits(input)).toBeNull();
  });
});
