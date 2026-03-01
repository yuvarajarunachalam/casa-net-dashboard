import React, { useEffect } from 'react'
import { TIER_LABELS, TIER_COLORS } from '../config'
import { riskColor } from '../utils/colors'
import { useNarrative } from '../hooks/useNarrative'
import GWChart from './GWChart'

function TrendArrow({ value }) {
  if (value > 0.05)  return <span className="trend-up">&uarr; {value.toFixed(2)}m/yr</span>
  if (value < -0.05) return <span className="trend-down">&darr; {Math.abs(value).toFixed(2)}m/yr</span>
  return <span className="trend-flat">stable</span>
}

function FeasibilityBar({ score }) {
  const color = score >= 70 ? '#27ae60' : score >= 45 ? '#e67e22' : '#c0392b'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="rec-label">Feasibility Score</span>
        <span className="rec-value">{score}/100</span>
      </div>
      <div className="feasibility-bar-container">
        <div
          className="feasibility-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  )
}

const CROPS = ['Rice', 'Groundnut', 'Jowar', 'Bajra', 'Maize']
const CROP_COLORS = {
  Rice      : '#3498db',
  Groundnut : '#e67e22',
  Maize     : '#f1c40f',
  Jowar     : '#27ae60',
  Bajra     : '#9b59b6',
}

// Side-by-side before/after crop mix bars
function CropPortfolioSection({ cropRecData }) {
  if (!cropRecData) return null

  const entries = CROPS
    .map(c => ({
      crop   : c,
      current: Number(cropRecData[`Current_${c}_pct`] ?? 0),
      target : Number(cropRecData[`Target_${c}_pct`]  ?? 0),
    }))
    .filter(e => e.current > 0.5 || e.target > 0.5)
    .sort((a, b) => b.current - a.current)

  if (!entries.length) return null

  const primaryCrop    = cropRecData.Primary_Transition_Crop
  const secondaryCrop  = cropRecData.Secondary_Transition_Crop
  const currentBurden  = cropRecData.Current_Water_Burden_Lkg
  const targetBurden   = cropRecData.Target_Water_Burden_Lkg
  const waterSaving    = cropRecData.Blended_Water_Saving_pct

  return (
    <div>
      <div className="section-title">Crop Portfolio Transition</div>
      <div style={{
        background  : '#f8f9fa',
        borderRadius: 8,
        padding     : '12px 14px',
        border      : '1px solid #e8ecf0',
      }}>
        {/* Transition summary line */}
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#2c3e50', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{
            background: '#fdecea', color: '#c0392b',
            borderRadius: 4, padding: '2px 7px', fontSize: 11,
          }}>
            {primaryCrop || '—'}
          </span>
          {secondaryCrop && secondaryCrop !== 'None' && typeof secondaryCrop === 'string' && (
            <>
              <span style={{ color: '#aaa', fontSize: 11 }}>+</span>
              <span style={{
                background: '#eaf4fb', color: '#2980b9',
                borderRadius: 4, padding: '2px 7px', fontSize: 11,
              }}>
                {secondaryCrop}
              </span>
            </>
          )}
          <span style={{ color: '#aaa', fontSize: 11, marginLeft: 4 }}>transition target</span>
        </div>

        {/* Before / After column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '72px 1fr 8px 1fr',
          gap: 4, marginBottom: 6,
        }}>
          <div />
          <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textAlign: 'center' }}>
            CURRENT
          </div>
          <div />
          <div style={{ fontSize: 10, fontWeight: 700, color: '#27ae60', textAlign: 'center' }}>
            TARGET
          </div>
        </div>

        {/* Crop rows */}
        {entries.map(({ crop, current, target }) => (
          <div key={crop} style={{
            display: 'grid', gridTemplateColumns: '72px 1fr 8px 1fr',
            alignItems: 'center', gap: 4, marginBottom: 5,
          }}>
            <div style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                background: CROP_COLORS[crop] || '#95a5a6', flexShrink: 0,
              }} />
              {crop}
            </div>

            {/* Current bar + pct */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                flex: 1, background: '#e8ecf0', borderRadius: 3, height: 10, overflow: 'hidden',
              }}>
                <div style={{
                  width    : `${Math.min(current, 100)}%`,
                  background: CROP_COLORS[crop] || '#95a5a6',
                  height   : '100%',
                  borderRadius: 3,
                  opacity  : 0.7,
                }} />
              </div>
              <span style={{ fontSize: 10, color: '#555', width: 30, textAlign: 'right', flexShrink: 0 }}>
                {current.toFixed(0)}%
              </span>
            </div>

            <div />

            {/* Target bar + pct */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                flex: 1, background: '#e8ecf0', borderRadius: 3, height: 10, overflow: 'hidden',
              }}>
                <div style={{
                  width    : `${Math.min(target, 100)}%`,
                  background: CROP_COLORS[crop] || '#95a5a6',
                  height   : '100%',
                  borderRadius: 3,
                }} />
              </div>
              <span style={{
                fontSize: 10, width: 30, textAlign: 'right', flexShrink: 0,
                fontWeight: target !== current ? 700 : 400,
                color    : target > current ? '#27ae60' : target < current ? '#c0392b' : '#555',
              }}>
                {target.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}

        {/* Water burden summary */}
        {currentBurden != null && targetBurden != null && (
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: '1px solid #e0e4e8',
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, color: '#555' }}>
              Water burden:&nbsp;
              <span style={{ fontWeight: 700 }}>
                {Math.round(currentBurden).toLocaleString()} L/kg
              </span>
              <span style={{ color: '#aaa', margin: '0 4px' }}>→</span>
              <span style={{ fontWeight: 700, color: '#27ae60' }}>
                {Math.round(targetBurden).toLocaleString()} L/kg
              </span>
            </div>
            {waterSaving != null && (
              <div style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                color: '#27ae60', background: '#eafaf1',
                padding: '2px 8px', borderRadius: 10,
              }}>
                −{Number(waterSaving).toFixed(1)}% saving
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DistrictPanel({
  district, districtData, cropRecData, gwHistory,
  onOpenPolicy, panelOpen, onClose,
}) {
  const { narrative, loading, source, fetchNarrative } = useNarrative()

  // Trigger AI narrative fetch whenever the selected district changes.
  // Now passes cropRecData so the prompt includes crop area distribution.
  useEffect(() => {
    if (districtData) fetchNarrative(districtData, cropRecData)
  }, [districtData, cropRecData, fetchNarrative])

  // Empty state shown before any district is clicked
  if (!district || !districtData) {
    return (
      <div className={`district-panel ${panelOpen ? 'panel-open' : ''}`}>
        <div className="district-panel-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
            <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/>
            <path d="M12 8v4l3 3"/>
          </svg>
          <p>Click any district on the map to view detailed groundwater forecasts, crop recommendations, and AI-generated policy insights.</p>
        </div>
      </div>
    )
  }

  const d         = districtData
  const tierColor = TIER_COLORS[d.Tier] || '#95a5a6'
  const history   = gwHistory?.[district] || []

  return (
    <div className={`district-panel ${panelOpen ? 'panel-open' : ''}`}>
      {/* District name, tier badge, and action buttons */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-district-name">{district}</div>
            <span className="tier-badge" style={{ background: tierColor }}>
              Tier {d.Tier} — {TIER_LABELS[d.Tier]}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {onOpenPolicy && (
              <button
                onClick={() => onOpenPolicy(district)}
                style={{
                  background   : '#1c2e4a',
                  color        : 'white',
                  border       : 'none',
                  borderRadius : 6,
                  padding      : '5px 12px',
                  fontSize     : 11,
                  fontWeight   : 600,
                  cursor       : 'pointer',
                  letterSpacing: '0.3px',
                }}
              >
                Full Analysis →
              </button>
            )}
            {/* Mobile close button */}
            <button
              className="panel-close-btn"
              onClick={onClose}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className="panel-body">

        {/* Key metrics grid */}
        <div>
          <div className="section-title">Groundwater Status</div>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Predicted Depth (1yr)</div>
              <div className="metric-value">
                {d.CASA_Pred_1yr?.toFixed(2)}
                <span className="metric-unit">m</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Predicted Depth (5yr)</div>
              <div className="metric-value">
                {d.CASA_Pred_5yr?.toFixed(2)}
                <span className="metric-unit">m</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">GW Trend</div>
              <div className="metric-value" style={{ fontSize: 14, paddingTop: 4 }}>
                <TrendArrow value={d.GW_Trend_m_per_yr || 0} />
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">GW Dependency</div>
              <div className="metric-value">
                {Math.round((d.GW_Dep_Ratio || 0) * 100)}
                <span className="metric-unit">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* GW forecast chart */}
        <div>
          <div className="section-title">Historical GW Depth + CASA-Net Forecast</div>
          <GWChart history={history} />
        </div>

        {/* Crop portfolio transition — new before/after section */}
        <CropPortfolioSection cropRecData={cropRecData} />

        {/* Crop recommendation card */}
        <div>
          <div className="section-title">Recommendation (Samba 1yr)</div>
          <div className="rec-card" style={{
            borderLeftColor:
              d.Recommendation_Type === 'Switch'   ? '#c0392b' :
              d.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60'
          }}>
            <div className="rec-row">
              <span className="rec-label">Action</span>
              <span className="rec-value" style={{
                color:
                  d.Recommendation_Type === 'Switch'   ? '#c0392b' :
                  d.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60',
                fontSize: 12,
              }}>
                {d.Recommendation_Type || '—'}
              </span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#2c3e50', marginBottom: 8 }}>
              {d.Recommendation_Text || '—'}
            </div>
            {d.Recommendation_Type !== 'Maintain' && (
              <>
                <div className="rec-row">
                  <span className="rec-label">Primary Target Crop</span>
                  <span className="rec-value">{d.Recommended_Crop || '—'}</span>
                </div>
                <div className="rec-row">
                  <span className="rec-label">Water Saving</span>
                  <span className="rec-value" style={{ color: '#27ae60' }}>
                    {d.Potential_Water_Saving_pct?.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <FeasibilityBar score={d.Feasibility_Score || 0} />
            </div>
          </div>
        </div>

        {/* Flood and drought risk badges */}
        <div>
          <div className="section-title">Contingency Risk</div>
          <div className="risk-badges">
            <div className="risk-badge" style={{ background: riskColor(d.Flood_Risk) }}>
              <span className="risk-badge-label">Flood Risk</span>
              {d.Flood_Risk}
            </div>
            <div className="risk-badge" style={{ background: riskColor(d.Drought_Risk) }}>
              <span className="risk-badge-label">Drought Risk</span>
              {d.Drought_Risk}
            </div>
          </div>
        </div>

        {/* AI Policy Narrative */}
        <div>
          <div className="section-title">Policy Brief</div>
          <div className="ai-narrative">
            {loading ? (
              <div className="ai-loading">Generating analysis...</div>
            ) : (
              <p className="ai-narrative-text">{narrative}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}