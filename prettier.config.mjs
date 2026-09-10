// Re-exports the shared config so editors and any tool that looks for a config
// at the repo root find the same settings the pnpm scripts pass via --config.
// Without this, format-on-save falls back to Prettier's 80-column default and
// reformats files against the repo's own style.
export { default } from "./packages/config/prettier.config.mjs";
