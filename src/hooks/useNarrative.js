// useNarrative.js
// Fetches AI-generated policy narratives for individual districts.
//
// Environment routing:
//   Development (npm run dev):
//     Calls Groq directly from the browser using VITE_GROQ_API_KEY from .env.local.
//
//   Production (Vercel):
//     Calls /api/narrative (serverless function) which reads GROQ_API_KEY server-side.
//     The key is never exposed to the browser in production.
//
// Payload now includes crop area distribution (before/after) and MSP revenue context
// so the Groq prompt can reference specific portfolio numbers in the brief.

import { useState, useCallback, useRef } from 'react'

const cache = {}

const CROPS = ['Rice', 'Groundnut', 'Jowar', 'Bajra', 'Maize']

// MSP 2023-24 values (₹/quintal) — kept in sync with config.js
const MSP_2324 = {
  Rice     : 2183,
  Groundnut: 6377,
  Jowar    : 3180,
  Bajra    : 2500,
  Maize    : 2090,
}

// Format crop portfolio as a readable string for the prompt
// e.g. "Rice 65.2%, Groundnut 20.1%, Jowar 8.5%, Bajra 4.2%, Maize 2.0%"
function formatCropMix(rec, prefix) {
  if (!rec) return null
  return CROPS
    .map(c => {
      const val = rec[`${prefix}_${c}_pct`]
      return val != null && val > 0.5 ? `${c} ${Number(val).toFixed(1)}%` : null
    })
    .filter(Boolean)
    .join(', ') || null
}

// Build the enriched payload sent to /api/narrative
export function buildNarrativePayload(districtRow, cropRecData) {
  const currentMix = formatCropMix(cropRecData, 'Current')
  const targetMix  = formatCropMix(cropRecData, 'Target')

  // MSP revenue context for the recommended crop
  const recCrop    = districtRow.Recommended_Crop
  const mspVal     = MSP_2324[recCrop]
  const mspContext = mspVal
    ? `${recCrop} MSP ₹${mspVal.toLocaleString('en-IN')}/quintal (2023-24)`
    : null

  // Water burden before/after from crop_recommendations.csv
  const currentBurden = cropRecData?.Current_Water_Burden_Lkg
  const targetBurden  = cropRecData?.Target_Water_Burden_Lkg

  return {
    district          : districtRow.District,
    depth             : districtRow.CASA_Pred_1yr,
    trend             : districtRow.GW_Trend_m_per_yr || 0,
    tier              : districtRow.Tier,
    recommended_crop  : recCrop,
    water_saving      : districtRow.Potential_Water_Saving_pct,
    gw_dependency     : districtRow.GW_Dep_Ratio || 0,
    shap_top_driver   : districtRow.SHAP_Top_Driver_Label || 'long-term depletion trend',
    flood_risk        : districtRow.Flood_Risk,
    drought_risk      : districtRow.Drought_Risk,
    fallback_narrative: districtRow.Policy_Narrative,
    // Crop portfolio enrichment
    current_crop_mix  : currentMix,
    target_crop_mix   : targetMix,
    primary_crop      : cropRecData?.Primary_Transition_Crop   || recCrop,
    secondary_crop    : cropRecData?.Secondary_Transition_Crop || null,
    current_burden_lkg: currentBurden,
    target_burden_lkg : targetBurden,
    msp_context       : mspContext,
  }
}

// Call the Vercel serverless function (production)
async function callVercelFunction(payload) {
  const response = await fetch('/api/narrative', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`API ${response.status}`)
  const data = await response.json()
  if (!data.narrative) throw new Error('Empty API response')
  return { narrative: data.narrative, source: data.source || 'groq' }
}

export function useNarrative() {
  const [loading,   setLoading]   = useState(false)
  const [narrative, setNarrative] = useState(null)
  const [source,    setSource]    = useState(null)
  const currentKey                = useRef(null)

  const fetchNarrative = useCallback(async (districtRow, cropRecData) => {
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

    const payload = buildNarrativePayload(districtRow, cropRecData)

    let text   = null
    let srcTag = 'precomputed'

    try {
      const result = await callVercelFunction(payload)
      text   = result.narrative
      srcTag = result.source
    } catch {
      // Vercel function failed — use precomputed text from Script 8
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