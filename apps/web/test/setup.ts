import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest is not running with `globals: true`, so Testing Library cannot register
// its own auto-cleanup. Without this, renders leak between tests and queries
// start matching elements from a previous test's DOM.
afterEach(cleanup);
