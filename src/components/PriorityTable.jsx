import React, { useState } from 'react'
import { TIER_LABELS, TIER_COLORS } from '../config'

function TierSection({ tier, rows, onSelectDistrict }) {
  const [open, setOpen] = useState(tier <= 2)
  const color = TIER_COLORS[tier]

  return (
    <div className="tier-section">
      <div
        className="tier-header"
        style={{ background: color }}
        onClick={() => setOpen(o => !o)}
      >
        <h3>Tier {tier} — {TIER_LABELS[tier]}</h3>
        <span className="tier-count">{rows.length} districts</span>
        <span className="tier-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="priority-table">
            <thead>
              <tr>
                <th>District</th>
                <th>Depth (1yr)</th>
                <th>Depth (5yr)</th>
                <th>Trend</th>
                <th>GW Dep.</th>
                <th>Recommended Action</th>
                <th>Water Saving</th>
                <th>Feasibility</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(d => (
                <tr key={d.District} onClick={() => onSelectDistrict(d.District)}>
                  <td style={{ fontWeight: 600 }}>{d.District}</td>
                  <td>{d.CASA_Pred_1yr?.toFixed(2)}m</td>
                  <td>{d.CASA_Pred_5yr?.toFixed(2)}m</td>
                  <td>
                    <span className={d.GW_Trend_m_per_yr > 0.05 ? 'trend-up' : d.GW_Trend_m_per_yr < -0.05 ? 'trend-down' : 'trend-flat'}>
                      {d.GW_Trend_m_per_yr > 0 ? '+' : ''}{d.GW_Trend_m_per_yr?.toFixed(2)}m/yr
                    </span>
                  </td>
                  <td>{Math.round((d.GW_Dep_Ratio || 0) * 100)}%</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 8,
                      marginRight: 6,
                      background:
                        d.Recommendation_Type === 'Switch'   ? '#fdecea' :
                        d.Recommendation_Type === 'Advisory' ? '#fef9e7' : '#eafaf1',
                      color:
                        d.Recommendation_Type === 'Switch'   ? '#c0392b' :
                        d.Recommendation_Type === 'Advisory' ? '#b7950b' : '#1e8449',
                    }}>
                      {d.Recommendation_Type || 'Maintain'}
                    </span>
                    {d.Recommended_Crop}
                  </td>
                  <td style={{ color: '#27ae60', fontWeight: 600 }}>
                    {d.Potential_Water_Saving_pct?.toFixed(1)}%
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                      fontWeight: 600,
                      background: d.Feasibility_Label === 'High' ? '#d5f5e3'
                                : d.Feasibility_Label === 'Medium' ? '#fef9e7' : '#fdecea',
                      color     : d.Feasibility_Label === 'High' ? '#1e8449'
                                : d.Feasibility_Label === 'Medium' ? '#b7950b' : '#c0392b',
                    }}>
                      {d.Feasibility_Score} · {d.Feasibility_Label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function PriorityTable({ districtTiers, onSelectDistrict }) {
  if (!districtTiers?.length) return null

  const sorted = [...districtTiers].sort((a, b) => (a.Tier - b.Tier) || (b.CASA_Pred_1yr - a.CASA_Pred_1yr))

  return (
    <div className="page-container">
      <div className="page-title">Priority Districts</div>
      <div className="page-subtitle">
        All 38 Tamil Nadu districts ranked by urgency tier. Click any row to view district detail on the map.
      </div>

      {[1, 2, 3, 4].map(tier => {
        const rows = sorted.filter(d => d.Tier === tier)
        if (!rows.length) return null
        return (
          <TierSection
            key={tier}
            tier={tier}
            rows={rows}
            onSelectDistrict={onSelectDistrict}
          />
        )
      })}
    </div>
  )
}