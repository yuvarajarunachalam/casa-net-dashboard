import React, { useEffect } from 'react'
import { TIER_LABELS, TIER_COLORS, DATA_FILES, WATERFALL_DISTRICTS } from '../config'
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

export default function DistrictPanel({ district, districtData, gwHistory, onOpenPolicy }) {
  const { narrative, loading, source, fetchNarrative } = useNarrative()

  // Trigger AI narrative fetch whenever the selected district changes
  useEffect(() => {
    if (districtData) fetchNarrative(districtData)
  }, [districtData, fetchNarrative])

  // Empty state shown before any district is clicked
  if (!district || !districtData) {
    return (
      <div className="district-panel">
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
    <div className="district-panel">
      {/* District name and tier */}
      <div className="panel-header">
        <div className="panel-district-name">{district}</div>
        <span className="tier-badge" style={{ background: tierColor }}>
          Tier {d.Tier} — {TIER_LABELS[d.Tier]}
        </span>
        {onOpenPolicy && (
          <button
            onClick={() => onOpenPolicy(district)}
            style={{
              marginLeft   : 'auto',
              background   : '#1c2e4a',
              color        : 'white',
              border       : 'none',
              borderRadius : 6,
              padding      : '5px 12px',
              fontSize     : 11,
              fontWeight   : 600,
              cursor       : 'pointer',
              flexShrink   : 0,
              letterSpacing: '0.3px',
            }}
          >
            Full Analysis →
          </button>
        )}
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

        {/* Crop recommendation */}
        <div>
          <div className="section-title">Crop Recommendation (Samba 1yr)</div>
          <div className="rec-card" style={{
            borderLeftColor:
              d.Recommendation_Type === 'Switch'   ? '#c0392b' :
              d.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60'
          }}>
            <div className="rec-row">
              <span className="rec-label">Recommendation</span>
              <span className="rec-value" style={{
                color:
                  d.Recommendation_Type === 'Switch'   ? '#c0392b' :
                  d.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60',
                fontSize: 12
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
                  <span className="rec-label">Target Crop</span>
                  <span className="rec-value">{d.Recommended_Crop || '—'}</span>
                </div>
                <div className="rec-row">
                  <span className="rec-label">Water Saving</span>
                  <span className="rec-value" style={{ color: '#27ae60' }}>
                    {d.Potential_Water_Saving_pct?.toFixed(1)}%
                  </span>
                </div>
                <div className="rec-row">
                  <span className="rec-label">Current Req.</span>
                  <span className="rec-value">{d.Current_Water_Req_Lkg?.toLocaleString()} L/kg</span>
                </div>
                <div className="rec-row">
                  <span className="rec-label">Target Req.</span>
                  <span className="rec-value">{d.Recommended_Water_Req_Lkg?.toLocaleString()} L/kg</span>
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

        {/* SHAP waterfall image — only available for the 5 focal districts */}
        {WATERFALL_DISTRICTS.includes(district) && (
          <div>
            <div className="section-title">SHAP Feature Contributions</div>
            <img
              src={`${DATA_FILES.shap_beeswarm.replace('shap_summary_beeswarm.png', '')}shap_waterfall_${district.replace(' ', '_')}.png`}
              alt={`SHAP waterfall for ${district}`}
              style={{ width: '100%', borderRadius: 6, border: '1px solid #dde3ea' }}
              onError={e => e.target.style.display = 'none'}
            />
          </div>
        )}

        {/* AI Policy Narrative */}
        <div>
          <div className="section-title">Policy Brief</div>
          <div className="ai-narrative">
            {loading ? (
              <div className="ai-loading">Generating analysis...</div>
            ) : (
              <p className="ai-narrative-text">{narrative}</p>
            )}
            {source && !loading && (
              <div className="ai-source-badge">
                {source === 'gemini' ? 'Gemini 2.0 Flash' : 'Precomputed (Script 8)'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}