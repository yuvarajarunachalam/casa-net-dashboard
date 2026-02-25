import React from 'react'
import { TIER_COLORS, TIER_LABELS } from '../config'
import { riskColor } from '../utils/colors'

export default function ComparableDistricts({ comparables, onSelect }) {
  if (!comparables?.length) {
    return (
      <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
        No comparable districts found within matching depth and dependency range.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {comparables.map(d => (
        <div
          key={d.District}
          onClick={() => onSelect(d.District)}
          style={{
            background  : '#f8f9fa',
            borderRadius: 6,
            padding     : '10px 14px',
            cursor      : 'pointer',
            border      : '1px solid #eee',
            transition  : 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#eaf4fb'}
          onMouseLeave={e => e.currentTarget.style.background = '#f8f9fa'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{d.District}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px',
              borderRadius: 10, background: TIER_COLORS[d.Tier], color: 'white'
            }}>
              Tier {d.Tier}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px',
              borderRadius: 10, marginLeft: 'auto',
              background:
                d.Recommendation_Type === 'Switch'   ? '#fdecea' :
                d.Recommendation_Type === 'Advisory' ? '#fef9e7' : '#eafaf1',
              color:
                d.Recommendation_Type === 'Switch'   ? '#c0392b' :
                d.Recommendation_Type === 'Advisory' ? '#b7950b' : '#1e8449',
            }}>
              {d.Recommendation_Type || 'Maintain'}
            </span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6, fontSize: 11
          }}>
            <div>
              <div style={{ color: '#999' }}>Depth</div>
              <div style={{ fontWeight: 600 }}>{d.CASA_Pred_1yr?.toFixed(2)}m</div>
            </div>
            <div>
              <div style={{ color: '#999' }}>GW Dep</div>
              <div style={{ fontWeight: 600 }}>
                {Math.round((d.GW_Dep_Ratio || 0) * 100)}%
              </div>
            </div>
            <div>
              <div style={{ color: '#999' }}>Feasibility</div>
              <div style={{
                fontWeight: 600,
                color: d.Feasibility_Score >= 70 ? '#27ae60'
                     : d.Feasibility_Score >= 45 ? '#e67e22' : '#c0392b'
              }}>
                {d.Feasibility_Score}
              </div>
            </div>
            <div>
              <div style={{ color: '#999' }}>Rec Crop</div>
              <div style={{ fontWeight: 600 }}>{d.Recommended_Crop}</div>
            </div>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
        Matched by depth (±1.5m), tier (±1), and GW dependency (±15%). Click to analyse.
      </div>
    </div>
  )
}