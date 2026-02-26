// AIInsightsPanel.jsx
// Displays the top 5 most urgent districts in a sidebar panel.
// On mount, fetches a Gemini narrative for each district sequentially
// (one at a time to respect the 15 RPM free tier rate limit).
//
// Clicking any district card selects it on the map and opens its detail panel.

import React, { useEffect, useState } from 'react'
import { TIER_COLORS } from '../config'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function buildPrompt(d) {
  return `You are a groundwater policy analyst advising the Tamil Nadu state government.
Using only the data below, write a 3-sentence policy brief (maximum 80 words) that:
1. States the core groundwater problem with specific numbers
2. Identifies the primary driver from the SHAP analysis
3. Gives one clear, specific actionable recommendation

District: ${d.District}
Predicted GW depth (next year): ${d.CASA_Pred_1yr}m
Water table trend: ${d.GW_Trend_m_per_yr > 0 ? '+' : ''}${d.GW_Trend_m_per_yr}m per year
Urgency tier: Tier ${d.Tier} of 4
Pump-fed irrigation dependency: ${Math.round((d.GW_Dep_Ratio || 0) * 100)}%
Recommended crop: ${d.Recommended_Crop}
Potential water saving: ${d.Potential_Water_Saving_pct}%
Primary SHAP driver: ${d.SHAP_Top_Driver_Label || 'long-term depletion trend'}
Flood risk: ${d.Flood_Risk}
Drought risk: ${d.Drought_Risk}

Write only the brief. No headings, no bullet points, no preamble.`
}

async function fetchNarrativeForDistrict(districtData) {
  // Dev: call Gemini directly via VITE_ key
  // Prod: call /api/narrative serverless function
  const isDev = import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY

  try {
    if (isDev) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          contents        : [{ parts: [{ text: buildPrompt(districtData) }] }],
          generationConfig: { maxOutputTokens: 160, temperature: 0.3 },
        }),
      })
      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    } else {
      const res = await fetch('/api/narrative', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          district          : districtData.District,
          depth             : districtData.CASA_Pred_1yr,
          trend             : districtData.GW_Trend_m_per_yr,
          tier              : districtData.Tier,
          recommended_crop  : districtData.Recommended_Crop,
          water_saving      : districtData.Potential_Water_Saving_pct,
          gw_dependency     : districtData.GW_Dep_Ratio,
          shap_top_driver   : districtData.SHAP_Top_Driver_Label,
          flood_risk        : districtData.Flood_Risk,
          drought_risk      : districtData.Drought_Risk,
          fallback_narrative: districtData.Policy_Narrative,
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      return data.narrative || null
    }
  } catch {
    return null
  }
}

// Brief pause between requests to stay under free tier rate limit (15 RPM)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default function AIInsightsPanel({ policySummary, onSelectDistrict, selectedDistrict }) {
  const [narratives, setNarratives] = useState({})
  const [fetchedCount, setFetchedCount] = useState(0)

  const top5 = [...(policySummary || [])]
    .sort((a, b) => (a.Tier - b.Tier) || (b.CASA_Pred_1yr - a.CASA_Pred_1yr))
    .slice(0, 5)

  useEffect(() => {
    if (!top5.length) return
    let cancelled = false

    async function loadSequentially() {
      for (const district of top5) {
        if (cancelled) return

        const text = await fetchNarrativeForDistrict(district)

        if (!cancelled) {
          setNarratives(prev => ({
            ...prev,
            [district.District]: text || district.Policy_Narrative || 'No narrative available.'
          }))
          setFetchedCount(c => c + 1)
        }

        // 4.5 second gap between requests stays safely under 15 RPM
        if (!cancelled) await sleep(4500)
      }
    }

    loadSequentially()
    return () => { cancelled = true }
  }, [])

  const hasApiKey = import.meta.env.DEV
    ? !!import.meta.env.VITE_GEMINI_API_KEY
    : true // assume Vercel has the key configured

  return (
    <div className="ai-insights-panel">
      <div className="ai-insights-header">
        <h3>Top 5 Priority Districts</h3>
        <p>
          {hasApiKey
            ? `AI briefs`
            : ''}
        </p>
      </div>

      <div className="ai-insights-list">
        {top5.map(d => {
          const text    = narratives[d.District]
          const color   = TIER_COLORS[d.Tier] || '#95a5a6'
          const isActive = d.District === selectedDistrict

          return (
            <div
              key={d.District}
              className={`ai-insight-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectDistrict(d.District)}
            >
              <div className="ai-insight-district">
                <span style={{
                  display: 'inline-block', width: 8, height: 8,
                  borderRadius: '50%', background: color, flexShrink: 0
                }} />
                {d.District}
                <span style={{ fontWeight: 400, fontSize: 11, color: '#999' }}>
                  Tier {d.Tier}
                </span>
              </div>
              <div className="ai-insight-depth">
                {d.CASA_Pred_1yr?.toFixed(2)}m depth &middot; rec: {d.Recommended_Crop}
              </div>
              <div className="ai-insight-text">
                {text
                  ? text
                  : <span style={{ color: '#aaa', fontStyle: 'italic' }}>
                      {hasApiKey ? 'Generating...' : d.Policy_Narrative}
                    </span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}