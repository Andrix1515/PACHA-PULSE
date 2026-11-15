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

The persistent scene guide and optional six-step tour are authored interface guidance, not generated model answers. Each weather lesson shows one metric and one chart; source, period, location and quality remain visible. Pacha can restate the same lesson without a network call. One millimetre of rain corresponds to one litre per square metre; this does not estimate effective root-zone water. Gemini chat is clearly identified as AI and can be wrong. The backend supplies verified climate summaries from the saved source or local cache, plus recomputed structural counts. It does not accept client-supplied climate totals as observations. Missing cached evidence stays unavailable. User profile and outline area remain user-provided context, never verified measurements.

Gemini extracts only stated profile values and explicit coordinates. It proposes typed, bounded actions; the interface displays values before confirmation. Unknown fields and actions are rejected. A confirmation can refresh the profile draft, which the proposal explains. No autonomous field changes or arbitrary code execution are enabled. Prompt instructions constrain interpretation but cannot guarantee every natural-language answer is correct; human review remains necessary.

## Agent and manual chart arithmetic

Both chart paths use the same deterministic builder. Climate charts use authentic normalized daily `T2M` or `PRECTOTCORR` values from the selected saved observation or server cache. No model-provided data arrays, titles, source labels or executable plotting code are accepted. Allowed metrics are rainfall, temperature and rotation structure.

Daily groups contain one day. Weekly charts use consecutive groups of up to seven days starting at the selected period's first date; these are not calendar weeks, and the final group can be shorter. Rainfall is summed only when every day in that group exists; otherwise its value is null. Temperature is the mean of available daily means, with partial quality if any day is missing. Values round to two decimals after aggregation. A period with no usable values is unavailable, not a zero chart. The accessible table and JSON export preserve missing values; CSV exports quote cells and protect text cells against spreadsheet formulas.

Rotation charts recompute distinct non-fallow crops, adjacent non-fallow repeats and fallow campaigns from the current three sequences. Three series share a count axis; dates and rainfall aggregation are not applied to these categorical sequences. No bar height is a crop suitability score. Charts preserve sources, periods, retrieval times, nominal resolution, derived status, quality and limitations.

The Gemini agent can inspect evidence and request supported chart configurations. Its loop is bounded; tools never write profiles, geometry, files or credentials. Profile and point proposals still require review. Prepared chart snapshots are read-only outputs and can be created directly on request. If model continuation fails after arithmetic succeeds, the application returns the real chart with an honest explanation-status notice.

## Progressive presentation (2026-11-15)

Grower questions, weather lessons and rotation steps reuse the existing calculations. Fewer visible numbers never change scientific methods, missing-value rules or source metadata. Agronomist mode opens tables/methods by default and uses identical evidence. Animation is decorative and never the only indication of status. No voice recording, speech output or continuous autonomous model execution was introduced.

Profile, query point and last scene now survive a same-tab reload through bounded, validated sessionStorage. Results are deliberately not restored as current observations: the user must explicitly reload a period. A retained outline remains user input and never changes NASA grid resolution.

## 3D and crop-reference boundaries (2026-11-15)

The 3D view converts saved WGS84 coordinates to a local equirectangular footprint, applies one display scale and extrudes a flat schematic surface. It does not sample elevation, imagery, soil or plant density. Display plants form a bounded grid clipped to the actual concave outline. Stage numbers are interface choices, not days or a calibrated phenological model. Campaign crop IDs come from the current comparison when available; otherwise the preview crop is explicitly independent of the saved profile.

The preliminary reference list compares the loaded period mean with cited general temperature bands: maize growth/photosynthesis 20-30 C, favourable potato daily means 18-20 C, indicative quinoa cultivation 15-20 C, and the published average-temperature range for common bean 15-23 C. Different reference contexts are disclosed. Wheat has no configured comparable band. Both edges are inclusive. Missing daily temperatures, absent observations or a different current query point leave the comparison unknown. An empty filtered list never means that nothing can grow in the region. There is no country-level crop ban, survival classification or suitability score. A selected historical month is not the growing season, and no new agronomic recommendation model is implemented.

Country/region search only moves the viewport. It does not use a country centroid as a parcel, infer soil from a place name, or silently change NASA evidence. Coordinates and geometry remain separately confirmed inputs.


## Local branch integration - 2026-11-15

Main's soil, location and terrain calculations are preserved. SoilGrids values are spatial model estimates averaged over a WCS window, not laboratory samples. Terrain slope/aspect derive from sampled extrema and distance, not a detailed surface. The 3D footprint stays flat and illustrative. Main's crop suitability and rotation agronomic assessments are heuristic catalogue/context rules, not validated field yield or success probabilities. Temperature delta, month and hemisphere are explicit scenario assumptions; they do not create a weather forecast or a confirmed planting calendar. The crop route now reads historical climate with exactly the same point/date/cache schema as the POWER route; a regression test rejects a neighbouring point or different period. GAEZ/FAOSTAT/SENAMHI/ERA5 metadata does not establish live product ingestion. Missing values stay unavailable and zero values remain valid.
