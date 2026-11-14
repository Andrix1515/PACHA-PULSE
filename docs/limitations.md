# Known limitations

- Only NASA POWER is integrated. The original challenge goal of two verified NASA products is not yet met; MODIS MOD13Q1 remains pending.
- No validated crop suitability, vegetation forecast, yield model, soil health assessment, pest diagnosis, irrigation scheduling or financial model is implemented.
- Climate uses a historical grid point, not the polygon's mean or a parcel sensor. Mountain terrain and microclimates can differ considerably. Date coverage and missing data must be checked for each query.
- Structural crop counts and rainfall multipliers support discussion, not a scientifically established best rotation. Campaign dates, local crop coefficients, soil tests, management, costs and prices are missing.
- Polygon area is approximate and excludes terrain; holes, antimeridian crossings, polar mapping beyond the Web Mercator limit and multiple active fields are unsupported. Coordinate entry can still select polar query points.
- OSM tiles require network access. Coordinate controls and outline editing remain available when tiles fail. No bulk tile download, satellite base layer or cadastral guarantee is provided.
- Pacha AI may make incorrect interpretations despite grounded context and typed proposals. Review its text and values. It cannot autonomously edit fields; confirmation is required. No voice input, speech output or agronomic diagnosis is included.
- Chat needs an owner's valid Gemini key, supported model, quota and network. Without them, a six-step local guide and all non-AI tools remain usable. Live Gemini has not been verified without credentials.
- Only the saved polygon persists locally. Profile, chat and results clear on reload. Exports are browser downloads, not cloud account storage. No authentication, shared farm database or cross-device synchronization exists.
- Vercel Services is currently Beta. Cache under `/tmp` is ephemeral and instance-local; the assistant cannot recover previously fetched climate from a different empty instance. It reports missing evidence rather than inventing it. The saved Mantaro example remains repeatable.
- The public demo's per-process request guard is not a distributed abuse or spend limit. Configure Vercel edge rules and Google quota/spend controls for public use. The app does not activate paid services or deploy itself.
- Automated accessibility checks and responsive tests do not certify universal accessibility. Manual screen-reader and user testing should follow, especially for map interaction.
