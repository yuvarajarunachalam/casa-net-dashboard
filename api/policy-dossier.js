// api/policy-dossier.js
// Vercel serverless function for the Policy Analysis page.
// Receives a section type and district data from the React app,
// calls Gemini server-side, and returns the generated text.
// The API key is stored as GEMINI_API_KEY in Vercel environment variables
// and is never exposed to the browser.
//
// Section types:
//   recommendation — why this crop switch/advisory/maintain decision
//   feasibility    — what is driving the feasibility score
//   contingency    — flood + drought risk across the full year
//   comparable     — how this district compares to similar ones

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='

function buildPromptRecommendation(d, cropPolicy, schemes) {
  const schemeList = schemes.join(', ')
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
TNAU crop guidance: ${cropPolicy.tnau_recommendation || ''}
PMKSY eligibility: ${cropPolicy.pmksy_note || ''}
Market context: ${cropPolicy.market_note || ''}
Implementation challenges: ${cropPolicy.challenges || ''}

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
Crop market context: ${cropPolicy.market_note || ''}
Crop challenges: ${cropPolicy.challenges || ''}
Water saving context: ${cropPolicy.water_saving_note || ''}

Write 3-4 sentences analysing the feasibility score for ${d.District}.
Explain specifically what is helping or hurting feasibility.
If feasibility is Low or Medium, identify the one main barrier and suggest how to address it.
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
${compText || 'No comparable districts found in this depth and dependency range.'}

Write 3-4 sentences comparing ${d.District} to these comparable districts.
Identify whether ${d.District} is doing better or worse on feasibility and why.
If a comparable district has a higher feasibility score, explain what ${d.District} could learn from it.
Be specific — reference actual numbers from the comparable districts.
No headings, no bullet points, no preamble.`
}

function buildPrompt(section, districtData, cropPolicy, schemes, comparables) {
  switch (section) {
    case 'recommendation': return buildPromptRecommendation(districtData, cropPolicy, schemes)
    case 'feasibility':    return buildPromptFeasibility(districtData, cropPolicy)
    case 'contingency':    return buildPromptContingency(districtData)
    case 'comparable':     return buildPromptComparable(districtData, comparables)
    default: throw new Error(`Unknown section: ${section}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { section, districtData, cropPolicy, schemes, comparables } = req.body

  if (!section || !districtData) {
    return res.status(400).json({ error: 'Missing section or districtData' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      text  : null,
      source: 'no_key',
      error : 'GEMINI_API_KEY not configured in Vercel environment variables.',
    })
  }

  let prompt
  try {
    prompt = buildPrompt(section, districtData, cropPolicy || {}, schemes || [], comparables || [])
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  try {
    const response = await fetch(`${GEMINI_URL}${apiKey}`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contents        : [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Gemini ${response.status}: ${body}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!text) throw new Error('Empty response from Gemini')

    return res.status(200).json({ text, source: 'gemini' })

  } catch (err) {
    return res.status(200).json({
      text  : null,
      source: 'error',
      error : err.message,
    })
  }
}