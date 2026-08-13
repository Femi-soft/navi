# NAVI contributor instructions

- Preserve the core boundary: AI interprets and explains; deterministic engines calculate; policy decides; adapters prepare; users authorize.
- Never treat model output, UI state, cached data, or a submitted transaction as verified financial state.
- Every externally sourced financial object must carry `source` and `retrievedAt`.
- Use decimal strings and `Decimal`; never use JavaScript `number` for balances or money arithmetic.
- Do not add arbitrary transaction construction to the AI or API layer. Execution must route through a reviewed adapter allowlist.
- Simulations expire. Refresh balances, prices, opportunity state, and policy before preparing a transaction.
- Do not mark portfolio effects final until a successful onchain receipt is independently verified.
- Update `docs/PROJECT_STATUS.md` when a milestone materially changes readiness.
- Run `npm.cmd run validate` before claiming the scaffold is healthy.
