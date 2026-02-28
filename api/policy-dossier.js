// api/policy-dossier.js
// Vercel serverless function for the Policy Analysis page.
// Receives a section type and district data, calls Groq server-side,
// returns the generated text.
//
// Section types:
//   recommendation — why this crop switch/advisory/maintain decision
//   feasibility    — what is driving the feasibility score
//   contingency    — flood + drought risk across the full year
//   comparable     — how this district compares to similar ones

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

const CROPS = ['Rice', 'Groundnut', 'Jowar', 'Bajra', 'Maize']

// MSP 2023-24 (₹/quintal) — kept in sync with frontend config.js
const MSP_2324 = {
  Rice     : 2183,
  Groundnut: 6377,
  Jowar    : 3180,
  Bajra    : 2500,
  Maize    : 2090,
}

// Build "Rice 65.2%, Groundnut 20.1%..." string from a data row
function formatCropMix(row, prefix) {
  if (!row) return null
  return CROPS
    .map(c => {
      const val = row[`${prefix}_${c}_pct`]
      return val != null && Number(val) > 0.5
        ? `${c} ${Number(val).toFixed(1)}%`
        : null
    })
    .filter(Boolean)
    .join(', ') || null
}

// Build a crop portfolio paragraph to inject into any prompt
function cropPortfolioBlock(d, cropRecData) {
  if (!cropRecData) return ''

  const currentMix     = formatCropMix(cropRecData, 'Current')
  const targetMix      = formatCropMix(cropRecData, 'Target')
  const primaryCrop    = cropRecData.Primary_Transition_Crop   || d.Recommended_Crop
  const secondaryCrop  = cropRecData.Secondary_Transition_Crop
  const currentBurden  = cropRecData.Current_Water_Burden_Lkg
  const targetBurden   = cropRecData.Target_Water_Burden_Lkg
  const blendedSaving  = cropRecData.Blended_Water_Saving_pct

  const lines = []
  if (currentMix)  lines.push(`Current crop portfolio: ${currentMix}`)
  if (targetMix)   lines.push(`Target crop portfolio:  ${targetMix}`)
  if (primaryCrop) lines.push(`Primary transition crop: ${primaryCrop}`)
  if (secondaryCrop && secondaryCrop !== 'None' && typeof secondaryCrop === 'string') {
    lines.push(`Secondary transition crop: ${secondaryCrop}`)
  }
  if (currentBurden != null && targetBurden != null) {
    lines.push(
      `Water burden: ${Math.round(Number(currentBurden)).toLocaleString()} L/kg → ` +
      `${Math.round(Number(targetBurden)).toLocaleString()} L/kg` +
      (blendedSaving != null ? ` (${Number(blendedSaving).toFixed(1)}% blended saving)` : '')
    )
  }

  // MSP revenue context for primary transition crop
  const msp = MSP_2324[primaryCrop]
  if (msp) {
    lines.push(`${primaryCrop} MSP: ₹${msp.toLocaleString('en-IN')}/quintal (2023-24 CCEA rate)`)
  }

  return lines.length ? '\n\nCrop portfolio data:\n' + lines.join('\n') : ''
}

function buildPromptRecommendation(d, cropPolicy, schemes, cropRecData) {
  const schemeList = schemes.join(', ')
  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District: ${d.District}
Urgency Tier: Tier ${d.Tier} — ${d.Tier_Label || ''}
Predicted GW depth (1yr): ${Number(d.CASA_Pred_1yr).toFixed(2)}m below ground
Predicted GW depth (5yr): ${Number(d.CASA_Pred_5yr).toFixed(2)}m below ground
Water table trend: ${Number(d.GW_Trend_m_per_yr) > 0 ? '+' : ''}${Number(d.GW_Trend_m_per_yr).toFixed(3)}m per year
Groundwater dependency: ${Math.round((d.GW_Dep_Ratio || 0) * 100)}% pump-fed
Recommendation type: ${d.Recommendation_Type}
Recommended crop: ${d.Recommended_Crop}
Water saving potential: ${Number(d.Potential_Water_Saving_pct).toFixed(1)}%
Primary model driver (SHAP): ${d.SHAP_Top_Driver_Label || 'long-term depletion trend'}
Government scheme eligibility: ${schemeList}
TNAU crop guidance: ${cropPolicy.tnau_recommendation || ''}
PMKSY eligibility: ${cropPolicy.pmksy_note || ''}
Market context: ${cropPolicy.market_note || ''}
Implementation challenges: ${cropPolicy.challenges || ''}${cropPortfolioBlock(d, cropRecData)}

Write 3-4 sentences explaining WHY this specific recommendation was made for ${d.District}.
Reference the actual GW depth, trend, and crop portfolio shift — cite specific before/after percentages.
Mention the MSP revenue opportunity to motivate farmer adoption.
Mention which government schemes support this transition.
Be specific to Tamil Nadu agricultural context — avoid generic advice.
Write in plain English suitable for a district agricultural officer.
No headings, no bullet points, no preamble.`
}

function buildPromptFeasibility(d, cropPolicy, cropRecData) {
  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District: ${d.District}
Feasibility score: ${d.Feasibility_Score}/100 — ${d.Feasibility_Label}
Recommendation type: ${d.Recommendation_Type}
Recommended crop: ${d.Recommended_Crop}
Water saving potential: ${Number(d.Potential_Water_Saving_pct).toFixed(1)}%
GW dependency: ${Math.round((d.GW_Dep_Ratio || 0) * 100)}%
Canal dependency: ${Math.round((d.Canal_Dep_Ratio || 0) * 100)}%
GW trend: ${Number(d.GW_Trend_m_per_yr) > 0 ? '+' : ''}${Number(d.GW_Trend_m_per_yr).toFixed(3)}m per year
Crop market context: ${cropPolicy.market_note || ''}
Crop challenges: ${cropPolicy.challenges || ''}
Water saving context: ${cropPolicy.water_saving_note || ''}${cropPortfolioBlock(d, cropRecData)}

Write 3-4 sentences analysing the feasibility score for ${d.District}.
Explain specifically what is helping or hurting feasibility.
Reference the crop portfolio shift scale — a large portfolio change is harder to execute than a small one.
If feasibility is Low or Medium, identify the one main barrier and suggest how to address it.
Be specific to Tamil Nadu agricultural and infrastructure context.
No headings, no bullet points, no preamble.`
}

function buildPromptContingency(d) {
  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District: ${d.District}
GW depth: ${Number(d.CASA_Pred_1yr).toFixed(2)}m
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
    `${c.District}: depth ${Number(c.CASA_Pred_1yr).toFixed(2)}m, ${Math.round((c.GW_Dep_Ratio||0)*100)}% GW dep, ` +
    `Tier ${c.Tier}, feasibility ${c.Feasibility_Score}, rec: ${c.Recommended_Crop} (${c.Recommendation_Type})`
  ).join('\n')

  return `You are a senior groundwater policy analyst advising the Tamil Nadu Agriculture Department.

District being analysed: ${d.District}
Depth: ${Number(d.CASA_Pred_1yr).toFixed(2)}m, GW dep: ${Math.round((d.GW_Dep_Ratio||0)*100)}%, Tier ${d.Tier}, feasibility: ${d.Feasibility_Score}

Comparable districts facing similar groundwater stress:
${compText || 'No comparable districts found in this depth and dependency range.'}

Write 3-4 sentences comparing ${d.District} to these comparable districts.
Identify whether ${d.District} is doing better or worse on feasibility and why.
If a comparable district has a higher feasibility score, explain what ${d.District} could learn from it.
Be specific — reference actual numbers from the comparable districts.
No headings, no bullet points, no preamble.`
}

function buildPrompt(section, districtData, cropPolicy, schemes, comparables, cropRecData) {
  switch (section) {
    case 'recommendation': return buildPromptRecommendation(districtData, cropPolicy, schemes, cropRecData)
    case 'feasibility':    return buildPromptFeasibility(districtData, cropPolicy, cropRecData)
    case 'contingency':    return buildPromptContingency(districtData)
    case 'comparable':     return buildPromptComparable(districtData, comparables)
    default: throw new Error(`Unknown section: ${section}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { section, districtData, cropPolicy, schemes, comparables, cropRecData } = req.body

  if (!section || !districtData) {
    return res.status(400).json({ error: 'Missing section or districtData' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      text  : null,
      source: 'no_key',
      error : 'GROQ_API_KEY not configured in Vercel environment variables.',
    })
  }

  let prompt
  try {
    prompt = buildPrompt(
      section, districtData,
      cropPolicy || {}, schemes || [],
      comparables || [], cropRecData || null
    )
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  try {
    const response = await fetch(GROQ_URL, {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model      : GROQ_MODEL,
        messages   : [{ role: 'user', content: prompt }],
        max_tokens : 220,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Groq ${response.status}: ${body}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) throw new Error('Empty response from Groq')

    return res.status(200).json({ text, source: 'groq' })

  } catch (err) {
    return res.status(200).json({
      text  : null,
      source: 'error',
      error : err.message,
    })
  }
}