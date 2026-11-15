# Guided jury demonstration

1. Open `/` or `/#demo`. Introduce Pacha and choose **I grow crops**. There are only two main choices. **I advise growers** uses the same evidence with technical details expanded.
2. Use the full-screen map to find a field. **Find my location** requests browser permission only when selected; **Field tools** offers latitude/longitude instead.
3. Choose **Draw my field**. Add corners in order, then tap the green first point to close and save after at least three points. Enter/Space and **Close and save field** are alternatives. Show approximate area and GeoJSON export under Field tools.
4. Continue to **About my field**. Give it a name, choose/write a crop, then choose a water source or **I am not sure**. Optional area, soil and past rotations remain under **Other details I know**.
5. In **Understand the weather**, choose a historical period or **Explore the Mantaro example**. Explain that the example changes the query point to -12.05, -75.2 and shows January 2025, not today's weather or the user's field.
6. Show rainfall first: displayed 60.6 mm. Pacha explains the bars. Continue to temperature: displayed 9.4 degrees C, then the meaning lesson. Source, location, dates and quality stay visible; the exact-value table is expandable. Archive values are 60.64 mm and 9.41 degrees C.
7. Continue to **Explore planting options**. Edit the usual sequence, confirm it represents current practice, then edit A and B. Try 100% or 70% historical rainfall. The latter is about 42.5 mm in the display, a hypothetical multiplier rather than a forecast.
8. Review one result at a time. Different crops, repeated transitions and rest campaigns are structural counts. They do not predict yield, water requirements or the best crop. Methods remain expandable.
9. Open the cloud **Menu**, then **Make a chart**. Prepare a manual daily/7-day rainfall chart and inspect source, exact values and CSV export. This requires no Gemini key. Switch between saved chart snapshots without showing several plots at once.
10. Select **Ask Pacha**. If Gemini is configured, ask for a simple explanation and a 7-day rainfall chart. Values are computed by server tools. Supply a crop/area and demonstrate that proposed changes wait for **Confirm and apply**. If unavailable, explain this and use the built-in guidance/manual builder.
11. Open **Keep my findings**, export the report or print a copy. Reloading preserves confirmed profile, query point and preferences in this tab, but observations/results must be explicitly loaded again. No farm account or permanent cloud storage is implied.

Use Menu preferences to pause animation, reduce guidance or change work mode. Reduced-motion preferences are also respected automatically. Pacha is a decorative guide with short gestures, not a requirement for using any tool. On phones, guidance stays compact above ordinary scenes and beside the map controls.

The old informational page is still available through **Menu → About Pacha Pulse** at `/#project`. Before sharing a jury link, follow [deployment instructions](VERCEL_DEPLOYMENT.md), test actual AI access, and check the public domain on a phone and in a private window. This local delivery does not create a deployment.

## Additional exploration route

On Find my field, search a country or region and explain that the camera moves without assigning its centroid to the farmer. Save an actual outline and open Explore in 3D. Turn/zoom/reset the camera, choose an illustrative crop and stage, and open What do we actually know? to distinguish inputs from unavailable measurements. If rotations have already been compared, choose their actual sequence and campaign instead. The 2D map remains the editing view.

Open Crop guide after loading weather. Show the source/period and the within/outside-reference groups; explicitly explain that a country is not one climate, one month is not the growing season, and no crop is banned by the tool. Pacha travels between scene anchors and changes expression. Demonstrate Pause and reduced motion if appropriate. The scale stays at the map's top right, clear of the bottom confirmation bar.


## Combined-branch additions

Open Menu -> Check soil & terrain after selecting a point. Pick a topic and read that source; provider requests are explicit, and estimates have source/limitations. Field tools also offers Street, Satellite and Terrain layers. Menu -> Explore crops opens the shared catalogue and preliminary screening, with missing evidence exposed. Try in Alternative A prepares a rotation draft only. Temperature and calendar assumptions are under an expandable section before comparison; Rule-based sequence review shows main's agronomic/calendar output. These rules do not guarantee a harvest.
