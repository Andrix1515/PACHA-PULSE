# Methods and evidence

## Historical climate

NASA POWER daily point queries use `community=AG`, UTC, `T2M`, `T2M_MIN`, `T2M_MAX` (degrees C), and `PRECTOTCORR` (mm/day). Dates must be historical, from 1981, ordered, and cover at most 366 days. The client makes at most two attempts with bounded timeouts. Cache identity includes product, parameters, coordinates, dates and schema.

Missing, nonfinite, negative precipitation and NASA fill values become null. Mean temperature averages available daily means and labels partial coverage. Rainfall totals require every day; incomplete series return null, not zero or a misleading partial total. Summaries preserve unit, status, source, period, retrieval date, resolution, quality and limitations.

The nominal MERRA-2 meteorological grid is 0.5 by 0.625 degrees. Mountain microclimates and fields may differ. This demo does not downscale climate or aggregate it over the polygon. Historical observations are not forecasts.

## Field geometry

The user defines one simple WGS84 polygon with 3 to 100 distinct points. Clicking/tapping point 1 after three corners, or pressing Enter/Space on it, closes and saves through the same validation as the explicit button. Closing never adds a repeated vertex. Fewer than three corners remain a draft. The editor checks numeric bounds, repeated points, crossing edges and area (at least 1 square metre, at most 1,000,000 hectares). Holes and antimeridian crossings are unsupported. GeoJSON import accepts one polygon and recalculates area rather than trusting supplied properties. Import remains a draft until confirmed.

Turf calculates approximate spherical area without terrain corrections. The representative query point belongs to the polygon or its boundary, including concave shapes. A manually selected point outside the polygon produces a warning. Extra decimals do not create cadastral precision. The entered profile area and derived outline area are separate values.

## Structural rotations

Three sequences each contain three undated campaigns. Sequence one is a reference; the user explicitly confirms whether it represents their practice. Distinct crop counts exclude fallow; consecutive repeats count adjacent equal non-fallow crops; fallow campaigns count rest entries. More diversity does not establish higher yield or local suitability. There is no ranking, weighting or probability of success.

Scenario rainfall = complete historical period total times chosen percentage / 100. The same period context applies to all sequences. At 70%, the saved 60.64 mm example produces 42.45 mm after rounding to two decimals. It is not a forecast, effective rainfall, irrigation supply or crop demand. ETo and stage-specific Kc are absent, so FAO-56 ETc cannot be calculated. Yield and profitability remain unavailable.

## Companion explanations

The six-step guide is authored interface guidance. Gemini chat is clearly identified as AI and can be wrong. The backend supplies verified climate summaries from the saved source or local cache, plus recomputed structural counts. It does not accept client-supplied climate totals as observations. Missing cached evidence stays unavailable. User profile and outline area remain user-provided context, never verified measurements.

Gemini extracts only stated profile values and explicit coordinates. It proposes typed, bounded actions; the interface displays values before confirmation. Unknown fields and actions are rejected. A confirmation can refresh the profile draft, which the proposal explains. The model has no autonomous execution capability. Prompt instructions constrain interpretation but cannot guarantee every natural-language answer is correct; human review remains necessary.

## Agent and manual chart arithmetic

Both chart paths use the same deterministic builder. Climate charts use authentic normalized daily `T2M` or `PRECTOTCORR` values from the selected saved observation or server cache. No model-provided data arrays, titles, source labels or executable plotting code are accepted. Allowed metrics are rainfall, temperature and rotation structure.

Daily groups contain one day. Weekly charts use consecutive groups of up to seven days starting at the selected period's first date; these are not calendar weeks, and the final group can be shorter. Rainfall is summed only when every day in that group exists; otherwise its value is null. Temperature is the mean of available daily means, with partial quality if any day is missing. Values round to two decimals after aggregation. A period with no usable values is unavailable, not a zero chart. The accessible table and JSON export preserve missing values; CSV exports quote cells and protect text cells against spreadsheet formulas.

Rotation charts recompute distinct non-fallow crops, adjacent non-fallow repeats and fallow campaigns from the current three sequences. Three series share a count axis; dates and rainfall aggregation are not applied to these categorical sequences. No bar height is a crop suitability score. Charts preserve sources, periods, retrieval times, nominal resolution, derived status, quality and limitations.

The Gemini agent can inspect evidence and request supported chart configurations. Its loop is bounded; tools never write profiles, geometry, files or credentials. Profile and point proposals still require review. Prepared chart snapshots are read-only outputs and can be created directly on request. If model continuation fails after arithmetic succeeds, the application returns the real chart with an honest explanation-status notice.
