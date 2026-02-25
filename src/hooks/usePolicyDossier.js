// usePolicyDossier.js
// Manages the full policy dossier generation for the Policy Analysis page.
// All Gemini calls go through /api/policy-dossier (Vercel serverless function)
// so the API key is never exposed in the browser.
//
// Four sections generated sequentially:
//   recommendation — why this crop switch/advisory/maintain decision
//   feasibility    — what is driving the feasibility score up or down
//   contingency    — flood + drought risk combined across the full year
//   comparable     — how this district compares to similar ones
//
// Rate limiting:
//   Session cap: 10 full dossier generations per browser session
//   Per-district cooldown: 60 seconds before same district can regenerate
//   Sequential calls with 4.5s gap to respect Gemini free tier (15 RPM)
//
// Caching:
//   Results cached in module-level object for the session lifetime

import { useState, useCallback, useRef } from 'react'
import { getCropPolicy, getSchemesForDistrict } from '../data/tn_policy_reference'

const SESSION_CAP  = 10
const COOLDOWN_MS  = 60000  // 60 seconds between regenerations of same district
const CALL_GAP_MS  = 4500   // gap between sequential Gemini calls

// Module-level — survives component remounts within the session
const dossierCache  = {}
const cooldownUntil = {}
let   sessionCount  = 0

async function callDossierAPI(section, districtData, cropPolicy, schemes, comparables) {
  const res = await fetch('/api/policy-dossier', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ section, districtData, cropPolicy, schemes, comparables }),
  })

  if (!res.ok) throw new Error(`API ${res.status}`)

  const data = await res.json()
  if (data.error && !data.text) throw new Error(data.error)
  return data.text
}

export function usePolicyDossier(allDistrictData, byDistrict) {
  const [sections,    setSections]    = useState({})
  const [generating,  setGenerating]  = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [cooldown,    setCooldown]    = useState(false)
  const [sessionFull, setSessionFull] = useState(false)
  const activeDistrict = useRef(null)

  function findComparables(district, data) {
    if (!data?.length) return []
    const d = (byDistrict && byDistrict[district])
      ? byDistrict[district]
      : data.find(r => r.District === district)
    if (!d) return []

    return data
      .filter(r =>
        r.District !== district &&
        Math.abs((r.CASA_Pred_1yr || 0) - (d.CASA_Pred_1yr || 0)) <= 1.5 &&
        Math.abs((r.Tier || 0)          - (d.Tier || 0))           <= 1   &&
        Math.abs((r.GW_Dep_Ratio || 0)  - (d.GW_Dep_Ratio || 0))  <= 0.15
      )
      .sort((a, b) =>
        Math.abs((a.CASA_Pred_1yr || 0) - (d.CASA_Pred_1yr || 0)) -
        Math.abs((b.CASA_Pred_1yr || 0) - (d.CASA_Pred_1yr || 0))
      )
      .slice(0, 3)
  }

  const generate = useCallback(async (district) => {
    if (!district) return

    if (dossierCache[district]) {
      setSections(dossierCache[district])
      setProgress(4)
      setGenerating(false)
      return
    }

    if (sessionCount >= SESSION_CAP) {
      setSessionFull(true)
      return
    }

    if (cooldownUntil[district] && Date.now() < cooldownUntil[district]) {
      setCooldown(true)
      setTimeout(() => setCooldown(false), cooldownUntil[district] - Date.now())
      return
    }

    // Use byDistrict for direct lookup — already correctly keyed from the data loader
    // This avoids name mismatch between GeoJSON dtname and CSV District column
    const districtData = (byDistrict && byDistrict[district])
      ? byDistrict[district]
      : allDistrictData?.find(r => r.District === district)
    if (!districtData) return

    activeDistrict.current = district
    setGenerating(true)
    setProgress(0)
    setSections({})
    setCooldown(false)
    sessionCount++

    const cropPolicy  = getCropPolicy(districtData.Recommended_Crop || 'Rice')
    const schemes     = getSchemesForDistrict(district)
    const comparables = findComparables(district, allDistrictData)

    const STEPS = [
      { key: 'recommendation' },
      { key: 'feasibility'    },
      { key: 'contingency'    },
      { key: 'comparable'     },
    ]

    const result = {}

    for (let i = 0; i < STEPS.length; i++) {
      if (activeDistrict.current !== district) return

      const { key } = STEPS[i]
      try {
        const text = await callDossierAPI(
          key, districtData, cropPolicy, schemes, comparables
        )
        result[key] = text
      } catch {
        result[key] = null
      }

      setProgress(i + 1)
      setSections({ ...result })

      if (i < STEPS.length - 1) {
        await new Promise(r => setTimeout(r, CALL_GAP_MS))
      }
    }

    dossierCache[district]  = { ...result }
    cooldownUntil[district] = Date.now() + COOLDOWN_MS
    setGenerating(false)
    setProgress(4)
  }, [allDistrictData])

  return {
    sections,
    generating,
    progress,
    cooldown,
    sessionFull,
    sessionCount,
    SESSION_CAP,
    generate,
    findComparables: (d) => findComparables(d, allDistrictData),
  }
}