// usePolicyDossier.js
// Manages the full policy dossier generation for the Policy Analysis page.
//
// Four sections generated sequentially via Gemini:
//   1. recommendation  — why this crop switch/advisory/maintain decision
//   2. feasibility     — what is driving the feasibility score up or down
//   3. contingency     — flood + drought risk combined across the full year
//   4. comparable      — how this district compares to similar ones
//
// Rate limiting:
//   - Session cap: 10 full dossier generations per browser session
//   - Per-district cooldown: 60 seconds before same district can regenerate
//   - Sequential calls: each section fires after previous one completes
//
// Caching:
//   - Results cached in module-level object for the session
//   - Cached results return instantly without API calls

import { useState, useCallback, useRef } from 'react'
import { getCropPolicy, getSchemesForDistrict, SCHEME_NAMES } from '../data/tn_policy_reference'

const SESSION_CAP      = 10
const COOLDOWN_MS      = 60000  // 60 seconds

// Module-level state persists across component remounts
const dossierCache     = {}
const cooldownTimers   = {}
let   sessionCount     = 0

const GEMINI_ENDPOINT  =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='

function buildPromptRecommendation(d, cropPolicy, schemes) {
  const schemeList = schemes.map(s => `${s}: ${SCHEME_NAMES[s]}`).join('; ')
  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District: ${d.District}
Urgency Tier: Tier ${d.Tier} — ${d.Tier_Label}
Predicted GW depth (1yr): ${d.CASA_Pred_1yr}m below ground
Predicted GW depth (5yr): ${d.CASA_Pred_5yr}m below ground
Water table trend: ${d.GW_Trend_m_per_yr > 0 ? '+' : ''}${d.GW_Trend_m_per_yr}m per year
Groundwater dependency: ${Math.round((d.GW_Dep_Ratio || 0) * 100)}% pump-fed
Recommendation type: ${d.Recommendation_Type}
Recommended crop: ${d.Recommended_Crop}
Current dominant crop: ${d.Rec_Crop_Original || d.Recommended_Crop}
Water saving potential: ${d.Potential_Water_Saving_pct}%
Primary model driver (SHAP): ${d.SHAP_Top_Driver_Label || 'long-term depletion trend'}

Government scheme eligibility: ${schemeList}

TNAU crop guidance: ${cropPolicy.tnau_recommendation}
PMKSY eligibility: ${cropPolicy.pmksy_note}
Market context: ${cropPolicy.market_note}
Implementation challenges: ${cropPolicy.challenges}

Write 3-4 sentences explaining WHY this specific recommendation was made for ${d.District}.
Reference the actual depth numbers, trend, and GW dependency.
Mention which government schemes support this transition.
Be specific to Tamil Nadu agricultural context — avoid generic advice.
Write in plain English suitable for a district agricultural officer.
No headings, no bullet points, no preamble.`
}

function buildPromptFeasibility(d, cropPolicy) {
  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District: ${d.District}
Feasibility score: ${d.Feasibility_Score}/100 — ${d.Feasibility_Label}
Recommendation type: ${d.Recommendation_Type}
Recommended crop: ${d.Recommended_Crop}
Water saving potential: ${d.Potential_Water_Saving_pct}%
GW dependency: ${Math.round((d.GW_Dep_Ratio || 0) * 100)}%
Canal dependency: ${Math.round((d.Canal_Dep_Ratio || 0) * 100)}%
GW trend: ${d.GW_Trend_m_per_yr > 0 ? '+' : ''}${d.GW_Trend_m_per_yr}m per year

Crop market context: ${cropPolicy.market_note}
Crop challenges: ${cropPolicy.challenges}
Water saving context: ${cropPolicy.water_saving_note}

Write 3-4 sentences analysing the feasibility score for ${d.District}.
Explain specifically what is helping or hurting feasibility — reference the actual score components.
If feasibility is Low or Medium, identify the one main barrier and suggest how it could be addressed.
Be specific to Tamil Nadu agricultural and infrastructure context.
No headings, no bullet points, no preamble.`
}

function buildPromptContingency(d) {
  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District: ${d.District}
GW depth: ${d.CASA_Pred_1yr}m
GW dependency: ${Math.round((d.GW_Dep_Ratio || 0) * 100)}%
Flood risk: ${d.Flood_Risk}
Drought risk: ${d.Drought_Risk}
NE monsoon actual vs normal: ${d.NE_Monsoon_Actual_mm}mm vs ${d.NE_Monsoon_Normal_mm}mm normal
SW monsoon actual vs normal: ${d.SW_Monsoon_Actual_mm}mm vs ${d.SW_Monsoon_Normal_mm}mm normal
Fallback crop: ${d.Drought_Fallback_Crop}

Write 3-4 sentences describing the combined flood and drought risk picture for ${d.District} across the full agricultural year.
Explain how the Samba and Kuruvai seasons are each affected.
Reference the actual monsoon numbers.
Mention what the fallback crop option means for farmer income stability.
Be specific to Tamil Nadu cropping calendar context.
No headings, no bullet points, no preamble.`
}

function buildPromptComparable(d, comparables) {
  const compText = comparables.map(c =>
    `${c.District}: depth ${c.CASA_Pred_1yr}m, ${Math.round((c.GW_Dep_Ratio||0)*100)}% GW dep, ` +
    `Tier ${c.Tier}, feasibility ${c.Feasibility_Score}, rec: ${c.Recommended_Crop} (${c.Recommendation_Type})`
  ).join('\n')

  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District being analysed: ${d.District}
Depth: ${d.CASA_Pred_1yr}m, GW dep: ${Math.round((d.GW_Dep_Ratio||0)*100)}%, Tier ${d.Tier}, feasibility: ${d.Feasibility_Score}

Comparable districts facing similar groundwater stress:
${compText}

Write 3-4 sentences comparing ${d.District} to these comparable districts.
Identify whether ${d.District} is doing better or worse on feasibility and why.
If a comparable district has a higher feasibility score, explain what ${d.District} could learn from it.
Be specific — reference actual numbers from the comparable districts.
No headings, no bullet points, no preamble.`
}

async function callGemini(prompt, apiKey) {
  const res = await fetch(`${GEMINI_ENDPOINT}${apiKey}`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      contents        : [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Empty response')
  return text
}

export function usePolicyDossier(allDistrictData) {
  const [sections,   setSections]   = useState({})
  const [generating, setGenerating] = useState(false)
  const [progress,   setProgress]   = useState(0)   // 0-4 sections complete
  const [error,      setError]      = useState(null)
  const [cooldown,   setCooldown]   = useState(false)
  const [sessionFull, setSessionFull] = useState(false)
  const currentDistrict = useRef(null)

  // Find 2-3 comparable districts by depth range, tier, and GW dependency
  function findComparables(district, data) {
    if (!data?.length) return []
    const d = data.find(r => r.District === district)
    if (!d) return []

    return data
      .filter(r =>
        r.District !== district &&
        Math.abs((r.CASA_Pred_1yr || 0) - (d.CASA_Pred_1yr || 0)) <= 1.5 &&
        Math.abs((r.Tier || 0) - (d.Tier || 0)) <= 1 &&
        Math.abs((r.GW_Dep_Ratio || 0) - (d.GW_Dep_Ratio || 0)) <= 0.15
      )
      .sort((a, b) =>
        Math.abs((a.CASA_Pred_1yr||0) - (d.CASA_Pred_1yr||0)) -
        Math.abs((b.CASA_Pred_1yr||0) - (d.CASA_Pred_1yr||0))
      )
      .slice(0, 3)
  }

  const generate = useCallback(async (district) => {
    if (!district) return

    // Return cached result immediately
    if (dossierCache[district]) {
      setSections(dossierCache[district])
      setProgress(4)
      return
    }

    // Session cap check
    if (sessionCount >= SESSION_CAP) {
      setSessionFull(true)
      return
    }

    // Cooldown check
    if (cooldownTimers[district] && Date.now() < cooldownTimers[district]) {
      setCooldown(true)
      setTimeout(() => setCooldown(false), cooldownTimers[district] - Date.now())
      return
    }

    const districtData = allDistrictData?.find(r => r.District === district)
    if (!districtData) return

    currentDistrict.current = district
    setGenerating(true)
    setProgress(0)
    setSections({})
    setError(null)
    setCooldown(false)
    sessionCount++

    const apiKey    = import.meta.env.VITE_GEMINI_API_KEY
    const cropPolicy = getCropPolicy(districtData.Recommended_Crop || 'Rice')
    const schemes    = getSchemesForDistrict(district)
    const comparables = findComparables(district, allDistrictData)

    const result = {}

    const steps = [
      {
        key   : 'recommendation',
        label : 'Analysing recommendation rationale...',
        prompt: buildPromptRecommendation(districtData, cropPolicy, schemes),
      },
      {
        key   : 'feasibility',
        label : 'Evaluating feasibility factors...',
        prompt: buildPromptFeasibility(districtData, cropPolicy),
      },
      {
        key   : 'contingency',
        label : 'Assessing contingency risk...',
        prompt: buildPromptContingency(districtData),
      },
      {
        key   : 'comparable',
        label : 'Comparing with similar districts...',
        prompt: buildPromptComparable(districtData, comparables),
      },
    ]

    for (let i = 0; i < steps.length; i++) {
      if (currentDistrict.current !== district) return
      const step = steps[i]
      try {
        const text = await callGemini(step.prompt, apiKey)
        result[step.key] = text
      } catch {
        result[step.key] = null
      }
      setProgress(i + 1)
      setSections({ ...result })
      // 4.5s gap between calls to stay under 15 RPM free tier
      if (i < steps.length - 1) await new Promise(r => setTimeout(r, 4500))
    }

    // Cache result and set cooldown
    dossierCache[district]    = { ...result }
    cooldownTimers[district]  = Date.now() + COOLDOWN_MS
    setGenerating(false)
    setProgress(4)
  }, [allDistrictData])

  return {
    sections,
    generating,
    progress,
    error,
    cooldown,
    sessionFull,
    sessionCount,
    SESSION_CAP,
    generate,
    findComparables: (d) => findComparables(d, allDistrictData),
  }
}