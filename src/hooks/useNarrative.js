// useNarrative.js
// Persistent cache: briefs stored in localStorage so they survive page reloads.
// First click generates via /api/narrative (Groq). Subsequent visits load instantly.
// 38-district cap: once all 38 are cached, zero API calls are made during demo.

import { useState, useCallback, useRef } from 'react'

const STORAGE_PREFIX = 'casa_brief_v2_'
const CROPS = ['Rice', 'Groundnut', 'Jowar', 'Bajra', 'Maize']
const MSP_2324 = {
  Rice: 2183, Groundnut: 6377, Jowar: 3180, Bajra: 2500, Maize: 2090,
}

// In-memory cache for the current session (avoids localStorage reads on every render)
const memCache = {}

function storageGet(district) {
  if (memCache[district]) return memCache[district]
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + district)
    if (raw) {
      const parsed = JSON.parse(raw)
      memCache[district] = parsed
      return parsed
    }
  } catch {}
  return null
}

function storageSet(district, value) {
  memCache[district] = value
  try {
    localStorage.setItem(STORAGE_PREFIX + district, JSON.stringify(value))
  } catch {}
}

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

export function buildNarrativePayload(districtRow, cropRecData) {
  const currentMix = formatCropMix(cropRecData, 'Current')
  const targetMix  = formatCropMix(cropRecData, 'Target')
  const recCrop    = districtRow.Recommended_Crop
  const mspVal     = MSP_2324[recCrop]
  const mspContext = mspVal
    ? `${recCrop} MSP ₹${mspVal.toLocaleString('en-IN')}/quintal (2023-24)`
    : null

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
    current_crop_mix  : currentMix,
    target_crop_mix   : targetMix,
    primary_crop      : cropRecData?.Primary_Transition_Crop   || recCrop,
    secondary_crop    : cropRecData?.Secondary_Transition_Crop || null,
    current_burden_lkg: cropRecData?.Current_Water_Burden_Lkg,
    target_burden_lkg : cropRecData?.Target_Water_Burden_Lkg,
    msp_context       : mspContext,
  }
}

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
  const currentKey = useRef(null)

  const fetchNarrative = useCallback(async (districtRow, cropRecData) => {
    const key = districtRow?.District
    if (!key) return

    // Check persistent cache first
    const cached = storageGet(key)
    if (cached) {
      setNarrative(cached.narrative)
      return
    }

    currentKey.current = key
    setLoading(true)
    setNarrative(null)

    const payload = buildNarrativePayload(districtRow, cropRecData)
    let text = null

    try {
      const result = await callVercelFunction(payload)
      text = result.narrative
    } catch {
      text = payload.fallback_narrative || 'No narrative available.'
    }

    if (currentKey.current !== key) return

    storageSet(key, { narrative: text })
    setNarrative(text)
    setLoading(false)
  }, [])

  return { narrative, loading, fetchNarrative }
}