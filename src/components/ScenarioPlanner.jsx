import React, { useState } from 'react'
import { riskColor } from '../utils/colors'
import { RISK_COLORS } from '../config'

const SCENARIOS = [
  { id: 'flood',   label: 'Flood Scenario',   riskKey: 'Flood_Risk',   actionsKey: 'Flood_Actions' },
  { id: 'drought', label: 'Drought Scenario',  riskKey: 'Drought_Risk', actionsKey: 'Drought_Actions' },
]

const RISK_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export default function ScenarioPlanner({ floodByDistrict, droughtByDistrict, byDistrict }) {
  const [scenario, setScenario] = useState('flood')

  const current = SCENARIOS.find(s => s.id === scenario)

  // Merge contingency data with master district data
  const source = scenario === 'flood'
    ? Object.values(floodByDistrict || {})
    : Object.values(droughtByDistrict || {})

  const rows = source
    .map(row => ({
      ...row,
      ...byDistrict?.[row.District],
    }))
    .sort((a, b) => {
      const ra = RISK_ORDER[a[current.riskKey]] ?? 3
      const rb = RISK_ORDER[b[current.riskKey]] ?? 3
      return ra - rb || (b.CASA_Pred_1yr || 0) - (a.CASA_Pred_1yr || 0)
    })

  // Only show MEDIUM and HIGH — LOW is not actionable at this level
  const actionable = rows.filter(r => r[current.riskKey] !== 'LOW')

  return (
    <div className="page-container">
      <div className="page-title">Scenario Planning</div>
      <div className="page-subtitle">
        Contingency plans for districts with elevated flood or drought risk under current conditions.
        Low-risk districts are omitted.
      </div>

      {/* Scenario toggle */}
      <div className="scenario-controls">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            className={`scenario-btn ${scenario === s.id ? 'active' : ''}`}
            onClick={() => setScenario(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Risk summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {Object.keys(RISK_COLORS).map(level => {
          const count = rows.filter(r => r[current.riskKey] === level).length
          return (
            <div key={level} style={{
              background: RISK_COLORS[level], color: 'white',
              borderRadius: 8, padding: '10px 20px', textAlign: 'center',
              minWidth: 90
            }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{count}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{level}</div>
            </div>
          )
        })}
      </div>

      {actionable.length === 0 ? (
        <div className="card">
          <p className="text-muted">No districts at elevated risk under current conditions.</p>
        </div>
      ) : (
        <div className="scenario-cards">
          {actionable.map(row => {
            const risk  = row[current.riskKey]
            const color = riskColor(risk)
            const text  = row[current.actionsKey] || 'No action plan available.'

            return (
              <div
                key={row.District}
                className="scenario-card"
                style={{ borderLeftColor: color }}
              >
                <div className="scenario-card-district">{row.District}</div>
                <div className="scenario-card-risk" style={{ color }}>
                  {risk} RISK &middot; Depth {row.CASA_Pred_1yr?.toFixed(2)}m &middot; GW dep. {Math.round((row.GW_Dep_Ratio || row.GW_Dep_Ratio) * 100) || '—'}%
                </div>
                <div className="scenario-actions">{text}</div>

                {/* Fallback crop for drought scenario */}
                {scenario === 'drought' && row.Drought_Fallback_Crop && (
                  <div style={{
                    marginTop: 10, padding: '6px 10px', background: '#f8f9fa',
                    borderRadius: 4, fontSize: 12
                  }}>
                    Fallback crop: <strong>{row.Drought_Fallback_Crop}</strong>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
