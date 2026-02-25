// api/narrative.js
// Vercel serverless function — receives district data from the React app
// and returns a Gemini-generated policy narrative.
// The API key is stored as a Vercel environment variable (GEMINI_API_KEY)
// and never exposed to the browser.
//
// Fallback chain:
//   1. Gemini 2.0 Flash
//   2. Precomputed narrative from request body (always present)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { district, depth, trend, tier, recommended_crop, water_saving,
          gw_dependency, shap_top_driver, flood_risk, drought_risk,
          fallback_narrative } = req.body

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return res.status(200).json({
      narrative: fallback_narrative || 'AI narrative unavailable — no API key configured.',
      source: 'precomputed'
    })
  }

  const prompt = `You are an agricultural groundwater policy analyst advising the Tamil Nadu government.
Given the following district data, write a concise 3-sentence policy brief (max 80 words) that:
1. States the core problem with specific numbers
2. Explains the primary driver (from SHAP analysis)
3. Gives one clear actionable recommendation

District: ${district}
Predicted GW depth (1yr): ${depth}m
GW trend: ${trend > 0 ? '+' : ''}${trend}m/year
Urgency tier: Tier ${tier}
GW dependency on pumping: ${Math.round(gw_dependency * 100)}%
Recommended crop: ${recommended_crop}
Potential water saving: ${water_saving}%
Primary SHAP driver: ${shap_top_driver}
Flood risk: ${flood_risk}
Drought risk: ${drought_risk}

Write only the brief, no headings or bullet points.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.3 }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!text) throw new Error('Empty response from Gemini')

    return res.status(200).json({ narrative: text, source: 'gemini' })

  } catch (err) {
    // Always return something useful — never leave the UI empty
    return res.status(200).json({
      narrative: fallback_narrative || 'Narrative generation failed.',
      source: 'precomputed'
    })
  }
}
