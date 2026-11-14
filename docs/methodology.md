# Methods and evidence

## Historical climate

NASA POWER daily point queries use `community=AG`, UTC, `T2M`, `T2M_MIN`, `T2M_MAX` (degrees C), and `PRECTOTCORR` (mm/day). Dates must be historical, from 1981, ordered, and cover at most 366 days. The client makes at most two attempts with bounded timeouts. Cache identity includes product, parameters, coordinates, dates and schema.

Missing, nonfinite, negative precipitation and NASA fill values become null. Mean temperature averages available daily means and labels partial coverage. Rainfall totals require every day; incomplete series return null, not zero or a misleading partial total. Summaries preserve unit, status, source, period, retrieval date, resolution, quality and limitations.

The nominal MERRA-2 meteorological grid is 0.5 by 0.625 degrees. Mountain microclimates and fields may differ. This demo does not downscale climate or aggregate it over the polygon. Historical observations are not forecasts.

## Field geometry

The user defines one simple WGS84 polygon with 3 to 100 distinct points. The editor checks numeric bounds, repeated points, crossing edges and area (at least 1 square metre, at most 1,000,000 hectares). Holes and antimeridian crossings are unsupported. GeoJSON import accepts one polygon and recalculates area rather than trusting supplied properties. Import remains a draft until confirmed.

Turf calculates approximate spherical area without terrain corrections. The representative query point belongs to the polygon or its boundary, including concave shapes. A manually selected point outside the polygon produces a warning. Extra decimals do not create cadastral precision. The entered profile area and derived outline area are separate values.

## Structural rotations

Three sequences each contain three undated campaigns. Sequence one is a reference; the user explicitly confirms whether it represents their practice. Distinct crop counts exclude fallow; consecutive repeats count adjacent equal non-fallow crops; fallow campaigns count rest entries. More diversity does not establish higher yield or local suitability. There is no ranking, weighting or probability of success.

Scenario rainfall = complete historical period total times chosen percentage / 100. The same period context applies to all sequences. At 70%, the saved 60.64 mm example produces 42.45 mm after rounding to two decimals. It is not a forecast, effective rainfall, irrigation supply or crop demand. ETo and stage-specific Kc are absent, so FAO-56 ETc cannot be calculated. Yield and profitability remain unavailable.

## Companion explanations

The six-step guide is authored interface guidance. Gemini chat is clearly identified as AI and can be wrong. The backend supplies verified climate summaries from the saved source or local cache, plus recomputed structural counts. It does not accept client-supplied climate totals as observations. Missing cached evidence stays unavailable. User profile and outline area remain user-provided context, never verified measurements.

Gemini extracts only stated profile values and explicit coordinates. It proposes typed, bounded actions; the interface displays values before confirmation. Unknown fields and actions are rejected. A confirmation can refresh the profile draft, which the proposal explains. The model has no autonomous execution capability. Prompt instructions constrain interpretation but cannot guarantee every natural-language answer is correct; human review remains necessary.
