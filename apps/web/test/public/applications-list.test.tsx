import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const applications = [
  { id: "app-a", requestedAmountMinor: 100_000 },
  { id: "app-b", requestedAmountMinor: 200_000 },
  { id: "app-c", requestedAmountMinor: 300_000 },
  { id: "app-d", requestedAmountMinor: 400_000 },
].map((partial) => ({
  ...partial,
  status: "PENDING_REVIEW" as const,
  approvedAmountMinor: null,
  customer: {
    fullName: `Customer ${partial.id}`,
    lastName: "Example",
    gender: "FEMALE",
    taxId: `TAX-${partial.id}`,
    email: `${partial.id}@example.test`,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    loanApplications: {
      list: {
        useQuery: () => ({
          data: applications,
          isFetching: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
  },
}));

const { ApplicationsList } = await import("../../src/components/ApplicationsList");

describe("ApplicationsList", () => {
  it("does not carry a selection onto the rows of the next page", async () => {
    const user = userEvent.setup();
    render(<ApplicationsList />);

    // Page 1 holds app-a and app-b; select the first row.
    await user.click(screen.getByLabelText("Select application app-a"));
    expect(screen.getByLabelText("Select application app-a")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Next" }));

    // Page 2 holds app-c and app-d. Neither was selected, so neither may be checked.
    expect(screen.getByLabelText("Select application app-c")).not.toBeChecked();
    expect(screen.getByLabelText("Select application app-d")).not.toBeChecked();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("still shows the selection when the user returns to the original page", async () => {
    const user = userEvent.setup();
    render(<ApplicationsList />);

    await user.click(screen.getByLabelText("Select application app-a"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Previous" }));

    expect(screen.getByLabelText("Select application app-a")).toBeChecked();
    expect(screen.getByLabelText("Select application app-b")).not.toBeChecked();
  });
});
