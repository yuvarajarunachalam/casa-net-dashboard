// useNarrative.js
// Fetches AI-generated policy narratives for individual districts.
//
// Environment routing:
//   Development (npm run dev):
//     Calls Gemini 2.0 Flash directly from the browser using VITE_GEMINI_API_KEY
//     from your .env.local file. The key is exposed to the browser in dev only —
//     this is acceptable for local use and review demos.
//
//   Production (Vercel):
//     Calls /api/narrative (the serverless function in api/narrative.js) which
//     reads GEMINI_API_KEY from Vercel environment variables server-side.
//     The key is never exposed to the browser in production.
//
// Fallback chain (same in both environments):
//   1. Gemini 2.0 Flash response
//   2. Precomputed Policy_Narrative from Script 8 CSV
//
// Results are cached in memory for the session — same district is never
// fetched twice without a page reload.

import { useState, useCallback, useRef } from 'react'

const cache = {}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Build the prompt sent to Gemini.
// Kept tight and directive — the model should not invent context beyond
// what the district data provides.
function buildPrompt(d) {
  return `You are a groundwater policy analyst advising the Tamil Nadu state government.
Using only the data below, write a 3-sentence policy brief (maximum 80 words) that:
1. States the core groundwater problem with specific numbers
2. Identifies the primary driver from the SHAP analysis
3. Gives one clear, specific actionable recommendation

District: ${d.district}
Predicted GW depth (next year): ${d.depth}m below ground
Water table trend: ${d.trend > 0 ? '+' : ''}${d.trend}m per year
Urgency tier: Tier ${d.tier} of 4
Pump-fed irrigation dependency: ${Math.round(d.gw_dependency * 100)}%
Recommended crop transition: ${d.recommended_crop}
Potential water saving from transition: ${d.water_saving}%
Primary model driver (SHAP): ${d.shap_top_driver}
Flood risk level: ${d.flood_risk}
Drought risk level: ${d.drought_risk}

Write only the brief. No headings, no bullet points, no preamble.`
}

// Call Gemini directly from the browser (development only)
async function callGeminiBrowser(districtData) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) return null

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      contents         : [{ parts: [{ text: buildPrompt(districtData) }] }],
      generationConfig : { maxOutputTokens: 160, temperature: 0.3 },
    }),
  })

  if (!response.ok) throw new Error(`Gemini ${response.status}`)

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Empty Gemini response')
  return text
}

// Call the Vercel serverless function (production)
async function callVercelFunction(districtData) {
  const response = await fetch('/api/narrative', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(districtData),
  })
  if (!response.ok) throw new Error(`API ${response.status}`)
  const data = await response.json()
  if (!data.narrative) throw new Error('Empty API response')
  return data.narrative
}

export function useNarrative() {
  const [loading,   setLoading]   = useState(false)
  const [narrative, setNarrative] = useState(null)
  const [source,    setSource]    = useState(null)
  const currentKey                = useRef(null)

  const fetchNarrative = useCallback(async (districtRow) => {
    const key = districtRow?.District
    if (!key) return

    // Return cached result immediately
    if (cache[key]) {
      setNarrative(cache[key].narrative)
      setSource(cache[key].source)
      return
    }

    currentKey.current = key
    setLoading(true)
    setNarrative(null)
    setSource(null)

    // Normalise the district row into the shape both callers expect
    const payload = {
      district          : districtRow.District,
      depth             : districtRow.CASA_Pred_1yr,
      trend             : districtRow.GW_Trend_m_per_yr || 0,
      tier              : districtRow.Tier,
      recommended_crop  : districtRow.Recommended_Crop,
      water_saving      : districtRow.Potential_Water_Saving_pct,
      gw_dependency     : districtRow.GW_Dep_Ratio || 0,
      shap_top_driver   : districtRow.SHAP_Top_Driver_Label || 'long-term depletion trend',
      flood_risk        : districtRow.Flood_Risk,
      drought_risk      : districtRow.Drought_Risk,
      fallback_narrative: districtRow.Policy_Narrative,
    }

    let text   = null
    let srcTag = 'precomputed'

    try {
      // In development, VITE_GEMINI_API_KEY is available → call browser-side
      // In production, that env var is not set → call Vercel function
      const isDev = import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY

      if (isDev) {
        text   = await callGeminiBrowser(payload)
        srcTag = 'gemini'
      } else {
        text   = await callVercelFunction(payload)
        srcTag = 'gemini'
      }
    } catch {
      // Both paths failed — use precomputed text from Script 8
      text   = payload.fallback_narrative || 'No narrative available.'
      srcTag = 'precomputed'
    }

    // Discard stale response if user clicked a different district
    if (currentKey.current !== key) return

    cache[key] = { narrative: text, source: srcTag }
    setNarrative(text)
    setSource(srcTag)
    setLoading(false)
  }, [])

  return { narrative, loading, source, fetchNarrative }
}