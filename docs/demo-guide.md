# Jury demonstration

1. Open the project homepage. Explain that Pacha Pulse supports farmers and agronomists with historical context and rotation comparisons.
2. Open the demo. Choose **Take a guided tour** to meet Pacha. The built-in guide works without a provider key and is identified as authored guidance.
3. Open **My field**. Enter explicit coordinates or zoom into the map. Choose **Draw or edit field**, add at least three corners, then tap point 1 to close and save. Show that no duplicate vertex appears; Enter/Space and the explicit **Close and save field** button are alternatives. Show coordinate alternatives and GeoJSON export. The outline's area is approximate.
4. Enter a field name and current crop in **Your field profile**, leaving unknown values unspecified. Save the profile.
5. Open **NASA climate**. Select the authentic saved Mantaro example for a repeatable presentation. Clearly state that this moves the query point to -12.05, -75.2 and loads January 2025, not the user's field or current weather. Summaries are 9.41 degrees C and 60.64 mm before display rounding. Show the source link and table.
6. Switch work mode to **Agronomist** to reveal the table by default. Calculations and values stay the same.
7. Open **Rotation planner**. Edit the usual sequence and two alternatives. Confirm the reference. Compare at 100%, then 70%. The rainfall multiplier is hypothetical; no best crop, yield or water requirement is predicted.
8. Open **Charts** and prepare a daily or 7-day rainfall chart. Inspect its source, exact-values table and CSV export. This path works without Gemini.
9. If Gemini is configured, ask Pacha to explain the available results in simple language and to create a 7-day rainfall bar chart. The server computes the values and the assistant shows completed tool steps. Ask it to help enter a crop and area you explicitly supply. Show that the profile remains unchanged until **Confirm and apply**. If no key or network is available, use **Guided steps** and state why AI chat is unavailable.
10. Open **Reports**, export JSON or print, and close with source limitations and the need for local agronomic review.

For a public link, test the production domain in a private browser and on a phone before sharing. Do not hand a jury a protected preview URL that requires your Vercel login. See [deployment instructions](VERCEL_DEPLOYMENT.md).
