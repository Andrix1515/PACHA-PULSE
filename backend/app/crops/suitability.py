"""Crop suitability evaluation engine.

Synthesizes multiple scientific data streams:
- NASA POWER / ERA5 thermal and precipitation observations
- ISRIC SoilGrids pH, texture, and organic matter
- Digital Elevation Model (SRTM / Copernicus 90m)
- FAO GAEZ v5 agro-ecological suitability classes
- FAOSTAT national agricultural importance

Evaluates biophysical compatibility honestly without black-box machine learning
or false yield guarantees. Explicitly records limiting factors and data gaps.
"""

from typing import Literal
from app.crops.models import CandidateCrop, CandidateEvidence, Crop
from app.crops.catalog import CROPS_CATALOG, get_all_crops
from app.providers.location import LocationContext
from app.providers.soilgrids import SoilProfile
from app.providers.gaez import GAEZCropSuitability, GAEZEvaluation, SuitabilityClass
from app.providers.faostat import CountryAgroProfile


class CropSuitabilityEngine:
    def evaluate_candidates(
        self,
        location: LocationContext,
        climate_mean_temp_c: float | None = None,
        climate_rainfall_mm: float | None = None,
        soil: SoilProfile | None = None,
        water_regime: Literal["unknown", "rainfed", "irrigated", "mixed"] = "unknown",
        gaez: GAEZEvaluation | None = None,
        faostat: CountryAgroProfile | None = None,
    ) -> list[CandidateCrop]:
        candidates: list[CandidateCrop] = []

        # Map GAEZ crops by id for quick lookup
        gaez_map: dict[str, GAEZCropSuitability] = {}
        if gaez:
            for g in gaez.evaluated_crops:
                gaez_map[g.crop_id] = g

        # Map FAOSTAT crops by id
        faostat_map: dict[str, float] = {}
        if faostat:
            for st in faostat.top_crops_by_area:
                if st.harvested_area_ha:
                    faostat_map[st.crop_id] = st.harvested_area_ha

        for crop in get_all_crops():
            if crop.id == "fallow":
                # Fallow is a structural management practice, not a botanical candidate
                continue

            score = 0
            evidence: list[CandidateEvidence] = []
            limiting_factors: list[str] = []
            advantages: list[str] = []
            data_gaps: list[str] = []
            is_critically_incompatible = False

            req = crop.requirements

            # 1. Temperature evaluation
            if climate_mean_temp_c is not None:
                if req.temp_opt_min_c is not None and req.temp_opt_max_c is not None:
                    if req.temp_opt_min_c <= climate_mean_temp_c <= req.temp_opt_max_c:
                        score += 25
                        evidence.append(
                            CandidateEvidence(
                                factor="temperature",
                                status="compatible",
                                crop_requirement=f"Optimal {req.temp_opt_min_c} to {req.temp_opt_max_c} °C",
                                field_condition=f"{climate_mean_temp_c:.1f} °C (NASA POWER / ERA5)",
                                details="Field temperature aligns with the crop's optimal vegetative window.",
                            )
                        )
                        advantages.append(f"Favorable temperature regime (~{climate_mean_temp_c:.1f} °C).")
                    elif (req.temp_min_c is not None and req.temp_min_c <= climate_mean_temp_c <= (req.temp_max_c or 40.0)):
                        score += 14
                        evidence.append(
                            CandidateEvidence(
                                factor="temperature",
                                status="marginal",
                                crop_requirement=f"Tolerated {req.temp_min_c} to {req.temp_max_c} °C",
                                field_condition=f"{climate_mean_temp_c:.1f} °C",
                                details="Suboptimal thermal window; cycle duration or flowering may be affected.",
                            )
                        )
                        limiting_factors.append(f"Suboptimal thermal conditions ({climate_mean_temp_c:.1f} °C vs optimum {req.temp_opt_min_c}-{req.temp_opt_max_c} °C).")
                    else:
                        is_critically_incompatible = True
                        evidence.append(
                            CandidateEvidence(
                                factor="temperature",
                                status="incompatible",
                                crop_requirement=f"Range {req.temp_min_c} to {req.temp_max_c} °C",
                                field_condition=f"{climate_mean_temp_c:.1f} °C",
                                details="Field temperature is outside the tolerable biological threshold.",
                            )
                        )
                        limiting_factors.append(f"Temperature {climate_mean_temp_c:.1f} °C is outside the crop threshold ({req.temp_min_c} to {req.temp_max_c} °C).")
                else:
                    score += 15
                    data_gaps.append("Specific temperature thresholds unverified for this cultivar.")
            else:
                data_gaps.append("Historical temperature series not loaded; thermal suitability cannot be verified.")
                evidence.append(
                    CandidateEvidence(
                        factor="temperature",
                        status="unknown",
                        crop_requirement=f"Optimum {req.temp_opt_min_c}-{req.temp_opt_max_c} °C" if req.temp_opt_min_c else "Unknown",
                        field_condition="No climate series loaded",
                        details="Load historical NASA climate observations to verify thermal fit.",
                    )
                )

            # 2. Water / Rainfall evaluation
            is_irrigated = water_regime in ("irrigated", "mixed")
            if is_irrigated:
                score += 25
                evidence.append(
                    CandidateEvidence(
                        factor="water",
                        status="compatible",
                        crop_requirement=f"Water demand {req.water_demand_mm_min}-{req.water_demand_mm_max} mm",
                        field_condition=f"Irrigated supply ({water_regime})",
                        details="Controlled water supply mitigates meteorological precipitation deficits.",
                    )
                )
                advantages.append("Irrigation capacity supports meeting crop water requirements.")
            elif climate_rainfall_mm is not None:
                if req.water_demand_mm_min is not None:
                    if climate_rainfall_mm >= req.water_demand_mm_min * 0.85:
                        score += 22
                        evidence.append(
                            CandidateEvidence(
                                factor="water",
                                status="compatible",
                                crop_requirement=f"Demand {req.water_demand_mm_min}-{req.water_demand_mm_max} mm",
                                field_condition=f"{climate_rainfall_mm:.1f} mm rainfed period total",
                                details="Rainfall provides baseline moisture for crop development.",
                            )
                        )
                    elif climate_rainfall_mm >= req.water_demand_mm_min * 0.55:
                        score += 12
                        evidence.append(
                            CandidateEvidence(
                                factor="water",
                                status="marginal",
                                crop_requirement=f"Demand {req.water_demand_mm_min}-{req.water_demand_mm_max} mm",
                                field_condition=f"{climate_rainfall_mm:.1f} mm rainfed total",
                                details="Rainfall is lower than standard crop evapotranspiration demand.",
                            )
                        )
                        limiting_factors.append(f"Moderate water deficit under rainfed conditions ({climate_rainfall_mm:.0f} mm vs minimum {req.water_demand_mm_min:.0f} mm).")
                    else:
                        score += 5
                        limiting_factors.append(f"Severe rainfed moisture deficit ({climate_rainfall_mm:.0f} mm vs demand {req.water_demand_mm_min:.0f} mm).")
                        evidence.append(
                            CandidateEvidence(
                                factor="water",
                                status="incompatible",
                                crop_requirement=f"Demand {req.water_demand_mm_min}-{req.water_demand_mm_max} mm",
                                field_condition=f"{climate_rainfall_mm:.1f} mm rainfed total",
                                details="Significant moisture deficit without supplementary irrigation.",
                            )
                        )
            else:
                data_gaps.append("Water regime or rainfall total unspecified.")
                evidence.append(
                    CandidateEvidence(
                        factor="water",
                        status="unknown",
                        crop_requirement=f"Demand {req.water_demand_mm_min}-{req.water_demand_mm_max} mm" if req.water_demand_mm_min else "Unknown",
                        field_condition="Unspecified water balance",
                        details="Specify water management or load climate to evaluate moisture adequacy.",
                    )
                )

            # 3. Soil pH evaluation (SoilGrids)
            soil_ph = soil.ph_h2o.profile_mean if (soil and soil.ph_h2o and soil.ph_h2o.profile_mean is not None) else None
            if soil_ph is not None:
                if req.ph_opt_min is not None and req.ph_opt_max is not None:
                    if req.ph_opt_min <= soil_ph <= req.ph_opt_max:
                        score += 20
                        evidence.append(
                            CandidateEvidence(
                                factor="soil_ph",
                                status="compatible",
                                crop_requirement=f"Optimal pH {req.ph_opt_min}-{req.ph_opt_max}",
                                field_condition=f"pH {soil_ph:.1f} (SoilGrids 250m)",
                                details="Soil pH is within the optimal nutrient availability window.",
                            )
                        )
                        advantages.append(f"Optimal soil pH ({soil_ph:.1f}).")
                    elif (req.ph_min is not None and req.ph_min <= soil_ph <= (req.ph_max or 9.0)):
                        score += 12
                        evidence.append(
                            CandidateEvidence(
                                factor="soil_ph",
                                status="marginal",
                                crop_requirement=f"Tolerated pH {req.ph_min}-{req.ph_max}",
                                field_condition=f"pH {soil_ph:.1f}",
                                details="Soil pH is acceptable but outside optimal nutrient absorption range.",
                            )
                        )
                        limiting_factors.append(f"Suboptimal soil pH ({soil_ph:.1f}).")
                    else:
                        evidence.append(
                            CandidateEvidence(
                                factor="soil_ph",
                                status="incompatible",
                                crop_requirement=f"Tolerated pH {req.ph_min}-{req.ph_max}",
                                field_condition=f"pH {soil_ph:.1f}",
                                details="Soil acidity or alkalinity may cause aluminum toxicity or phosphorus fixation.",
                            )
                        )
                        limiting_factors.append(f"Soil pH {soil_ph:.1f} is outside crop tolerance ({req.ph_min}-{req.ph_max}).")
            else:
                data_gaps.append("Soil pH unmeasured; SoilGrids data unavailable or unverified.")
                evidence.append(
                    CandidateEvidence(
                        factor="soil_ph",
                        status="unknown",
                        crop_requirement=f"Optimum pH {req.ph_opt_min}-{req.ph_opt_max}" if req.ph_opt_min else "Unknown",
                        field_condition="Unmeasured soil pH",
                        details="Laboratory soil test or SoilGrids query required for soil pH confirmation.",
                    )
                )

            # 4. Elevation evaluation (DEM)
            elev = location.elevation_m
            if elev is not None and req.altitude_max_m is not None:
                if req.altitude_min_m is not None and req.altitude_min_m <= elev <= req.altitude_max_m:
                    score += 15
                    evidence.append(
                        CandidateEvidence(
                            factor="elevation",
                            status="compatible",
                            crop_requirement=f"Altitude {req.altitude_min_m:.0f} to {req.altitude_max_m:.0f} m",
                            field_condition=f"{elev:.0f} m.a.s.l. (SRTM DEM)",
                            details="Field elevation is within documented cultivation altitude range.",
                        )
                    )
                elif elev > req.altitude_max_m:
                    is_critically_incompatible = True
                    evidence.append(
                        CandidateEvidence(
                            factor="elevation",
                            status="incompatible",
                            crop_requirement=f"Max altitude {req.altitude_max_m:.0f} m",
                            field_condition=f"{elev:.0f} m.a.s.l.",
                            details="Elevation exceeds physiological ceiling (frost risk, low heat accumulation).",
                        )
                    )
                    limiting_factors.append(f"Elevation ({elev:.0f} m) exceeds maximum recommended altitude ({req.altitude_max_m:.0f} m).")
                else:
                    score += 10
            else:
                score += 10

            # 5. FAO GAEZ Suitability
            g_crop = gaez_map.get(crop.id)
            if g_crop:
                if g_crop.suitability_class == SuitabilityClass.VERY_SUITABLE:
                    score += 15
                    advantages.append("FAO GAEZ v5 classifies the agro-climatic zone as Very Suitable.")
                elif g_crop.suitability_class == SuitabilityClass.SUITABLE:
                    score += 12
                elif g_crop.suitability_class == SuitabilityClass.MODERATELY_SUITABLE:
                    score += 8
                elif g_crop.suitability_class == SuitabilityClass.MARGINALLY_SUITABLE:
                    score += 4
                    limiting_factors.append("FAO GAEZ v5 indicates marginal agro-climatic suitability.")
                elif g_crop.suitability_class == SuitabilityClass.NOT_SUITABLE:
                    is_critically_incompatible = True
                    limiting_factors.append("FAO GAEZ v5 indicates agro-climatic constraints are severe.")

                evidence.append(
                    CandidateEvidence(
                        factor="gaez_suitability",
                        status="compatible" if g_crop.suitability_class in (SuitabilityClass.VERY_SUITABLE, SuitabilityClass.SUITABLE) else "marginal",
                        crop_requirement="FAO GAEZ v5 Suitability Model",
                        field_condition=f"{g_crop.suitability_class.value.replace('_', ' ').title()} (Score {g_crop.suitability_score}/100)",
                        details=g_crop.notes,
                    )
                )

            # 6. FAOSTAT National Agricultural Statistics
            if crop.id in faostat_map:
                score += 5
                area_ha = faostat_map[crop.id]
                advantages.append(f"Widely cultivated nationally in {location.country_name} ({area_ha:,.0f} ha harvested - FAOSTAT).")
                evidence.append(
                    CandidateEvidence(
                        factor="faostat_national",
                        status="compatible",
                        crop_requirement="National commercial presence",
                        field_condition=f"{area_ha:,.0f} ha nationally (FAOSTAT)",
                        details="Established domestic crop with active seed supply and market channels.",
                    )
                )

            # Additional biological bonuses
            if crop.is_nitrogen_fixer:
                advantages.append(f"Biological nitrogen fixation capacity (est. ~{crop.biological_n_fixation_kg_ha:.0f} kg N/ha).")
            if crop.root_depth.value == "deep":
                advantages.append("Deep rooting architecture improves subsoil porosity and drought resilience.")

            # Determine suitability category
            final_score = min(100, max(0, score))
            if is_critically_incompatible:
                suit_category = "unsuitable"
                final_score = min(40, final_score)
            elif final_score >= 68:
                suit_category = "suitable"
            elif final_score >= 42:
                suit_category = "marginal"
            elif len(data_gaps) >= 3:
                suit_category = "insufficient_data"
            else:
                suit_category = "unsuitable"

            # Determine confidence level
            observed_streams = 0
            if climate_mean_temp_c is not None:
                observed_streams += 1
            if climate_rainfall_mm is not None:
                observed_streams += 1
            if soil_ph is not None:
                observed_streams += 1
            if g_crop is not None:
                observed_streams += 1

            if observed_streams >= 3:
                confidence = "high"
            elif observed_streams == 2:
                confidence = "medium"
            elif observed_streams == 1:
                confidence = "low"
            else:
                confidence = "exploratory"

            candidates.append(
                CandidateCrop(
                    crop=crop,
                    suitability_category=suit_category,
                    overall_score=final_score,
                    confidence_level=confidence,
                    limiting_factors=limiting_factors,
                    advantages=advantages,
                    evidence=evidence,
                    data_gaps=data_gaps,
                )
            )

        # Sort candidates: suitable first, ordered by score descending
        def sort_key(c: CandidateCrop):
            cat_order = {"suitable": 0, "marginal": 1, "insufficient_data": 2, "unsuitable": 3}
            return (cat_order.get(c.suitability_category, 4), -c.overall_score)

        candidates.sort(key=sort_key)
        return candidates


# Singleton suitability engine
suitability_engine = CropSuitabilityEngine()
