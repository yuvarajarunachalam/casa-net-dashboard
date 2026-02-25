// api/narrative.js
// Vercel serverless function — receives district data from the React app
// and returns a Groq-generated policy narrative.
// The API key is stored as a Vercel environment variable (GROQ_API_KEY)
// and never exposed to the browser.
//
// Fallback chain:
//   1. Groq (llama-3.1-8b-instant — free tier, fast)
//   2. Precomputed narrative from request body (always present)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { district, depth, trend, tier, recommended_crop, water_saving,
          gw_dependency, shap_top_driver, flood_risk, drought_risk,
          fallback_narrative } = req.body

  const apiKey = process.env.GROQ_API_KEY

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
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.3
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Groq API returned ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) throw new Error('Empty response from Groq')

    return res.status(200).json({ narrative: text, source: 'groq' })

  } catch (err) {
    return res.status(200).json({
      narrative: fallback_narrative || 'Narrative generation failed.',
      source: 'precomputed'
    })
  }
}