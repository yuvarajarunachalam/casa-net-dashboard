import React from 'react'
import { DATA_FILES } from '../config'

const MODELS = [
  { name: 'Naive Baseline', rmse: 1.923, mae: 1.459, mape: 26.3, spearman: null,  color: '#95a5a6' },
  { name: 'ARIMA',          rmse: 2.160, mae: 1.640, mape: 30.6, spearman: null,  color: '#bdc3c7' },
  { name: 'LSTM (1yr)',     rmse: 1.439, mae: 1.073, mape: 19.4, spearman: null,  color: '#e67e22' },
  { name: 'CASA-Net v6',    rmse: 1.287, mae: 0.999, mape: 14.6, spearman: 0.971, color: '#2980b9' },
]

const EVAL_METRICS = [
  { label: 'Tier Accuracy',        value: '71.7%',  color: '#27ae60', note: '38 districts' },
  { label: "Cohen's Kappa",        value: '0.542',  color: '#2980b9', note: 'Substantial agreement' },
  { label: 'Macro F1',             value: '0.698',  color: '#9b59b6', note: 'Across 3 tiers' },
  { label: 'T1↔T3 Misclass',      value: '0',      color: '#27ae60', note: 'Zero critical errors' },
  { label: 'Direction Accuracy',   value: '84.8%',  color: '#e67e22', note: 'Depleting: 83.3%' },
  { label: 'Spearman Rank',        value: '0.971',  color: '#2980b9', note: 'p < 0.0001' },
]

function MetricCard({ label, value, unit, note }) {
  return (
    <div className="model-metric-card">
      <div className="model-metric-value">
        {value}<span style={{ fontSize: 16 }}>{unit}</span>
      </div>
      <div className="model-metric-label">{label}</div>
      {note && <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function ImageCard({ title, description, src, alt }) {
  return (
    <div className="image-card">
      <div className="image-card-title">{title}</div>
      <div className="image-card-desc">{description}</div>
      <img src={src} alt={alt}
        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }}
      />
      <div style={{ display:'none', padding:'20px', color:'#aaa', fontSize:12, textAlign:'center' }}>
        Image not found — run Script 7 to generate SHAP plots.
      </div>
    </div>
  )
}

// Horizontal bar comparison
function ModelComparisonBar({ models, metric, lowerBetter = true }) {
  const vals  = models.map(m => m[metric]).filter(v => v != null)
  const maxV  = Math.max(...vals)
  const best  = lowerBetter ? Math.min(...vals) : Math.max(...vals)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {models.map(m => {
        const val    = m[metric]
        if (val == null) return null
        const pct    = (val / maxV) * 100
        const isBest = val === best
        return (
          <div key={m.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontWeight: isBest ? 700 : 400, color: isBest ? '#2c3e50' : '#7f8c8d' }}>
                {m.name}
              </span>
              <span style={{ fontWeight: 700, color: isBest ? '#27ae60' : '#7f8c8d' }}>
                {val}{isBest ? ' ✓' : ''}
              </span>
            </div>
            <div style={{ background: '#f0f2f5', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 4,
                background: isBest ? '#27ae60' : m.color,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ModelView({ modelMetrics }) {
  const casaRow  = modelMetrics?.find(r => r.Model?.includes('CASA'))
  const arimaRow = modelMetrics?.find(r => r.Model?.includes('ARIMA'))

  // Use live CSV values if available, else fall back to known v6 numbers
  const rmse = casaRow?.['RMSE (m)']  ?? 1.287
  const mae  = casaRow?.['MAE (m)']   ?? 0.999
  const mape = casaRow?.['MAPE (%)']  ?? 14.6

  const vsArima = arimaRow?.['RMSE (m)']
    ? ((arimaRow['RMSE (m)'] - rmse) / arimaRow['RMSE (m)'] * 100).toFixed(1)
    : '40.5'

  // Use live values in comparison models array
  const modelsForChart = [
    ...MODELS.slice(0, 3),
    { ...MODELS[3], rmse: +rmse, mae: +mae, mape: +mape },
  ]

  return (
    <div className="page-container">
      <div className="page-title">Model Evaluation</div>
      <div className="page-subtitle">
        CASA-Net v6 test set evaluation (2019–2022) across 38 Tamil Nadu districts.
        Three architectural improvements over baseline: Huber loss, lagged GW input, residual ARIMA connection.
      </div>

      {/* Primary metric cards */}
      <div className="model-metrics-row">
        <MetricCard label="Test RMSE" value={Number(rmse).toFixed(3)} unit="m" note="1yr forecast" />
        <MetricCard label="Test MAE"  value={Number(mae).toFixed(3)}  unit="m" note="1yr forecast" />
        <MetricCard label="MAPE"      value={Number(mape).toFixed(1)}  unit="%" note="1yr forecast" />
        <MetricCard label="vs ARIMA"  value={`+${vsArima}`} unit="%" note="RMSE improvement" />
      </div>

      {/* Model comparison bars */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Model Comparison — All Baselines</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d',
                          textTransform: 'uppercase', marginBottom: 10 }}>RMSE (m) ↓ lower is better</div>
            <ModelComparisonBar models={modelsForChart} metric="rmse" lowerBetter />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d',
                          textTransform: 'uppercase', marginBottom: 10 }}>MAE (m) ↓</div>
            <ModelComparisonBar models={modelsForChart} metric="mae" lowerBetter />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d',
                          textTransform: 'uppercase', marginBottom: 10 }}>MAPE (%) ↓</div>
            <ModelComparisonBar models={modelsForChart} metric="mape" lowerBetter />
          </div>
        </div>
      </div>

      {/* Beyond RMSE — tier and ranking metrics */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Beyond RMSE — Policy-Relevant Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {EVAL_METRICS.map(m => (
            <div key={m.label} style={{
              background: '#f8f9fa', borderRadius: 8, padding: '12px 14px',
              borderLeft: `3px solid ${m.color}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#7f8c8d',
                            textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2c3e50' }}>{m.value}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{m.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What these numbers mean */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">What These Metrics Mean in Practice</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: 16, marginTop: 12 }}>

          <div style={{ background: '#f0f7ff', borderRadius: 8, padding: '14px 16px',
                        borderLeft: '4px solid #2980b9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a5276', marginBottom: 6,
                          textTransform: 'uppercase', letterSpacing: '0.4px' }}>RMSE in Context</div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#2c3e50' }}>
              RMSE of <strong>{Number(rmse).toFixed(3)}m</strong> across 38 districts
              (depth range 1.5m–13m) represents <strong>~{(rmse/11.5*100).toFixed(0)}% of measurement range</strong>.
              Published LSTM models report 0.60–1.98m across single-well monthly tasks —
              this model handles 38 districts simultaneously at 1-year ahead.
            </div>
          </div>

          <div style={{ background: '#f0fff4', borderRadius: 8, padding: '14px 16px',
                        borderLeft: '4px solid #27ae60' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e8449', marginBottom: 6,
                          textTransform: 'uppercase', letterSpacing: '0.4px' }}>Spearman 0.971 — The Policy Number</div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#2c3e50' }}>
              For a planning tool, ranking districts by urgency matters more than exact depth.
              Spearman 0.971 means near-perfect ordering of all 38 districts —
              with <strong>zero Tier 1→Tier 3 misclassifications</strong>.
              The right districts get intervention first.
            </div>
          </div>

          <div style={{ background: '#fff8f0', borderRadius: 8, padding: '14px 16px',
                        borderLeft: '4px solid #e67e22' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a04000', marginBottom: 6,
                          textTransform: 'uppercase', letterSpacing: '0.4px' }}>CGWB 2023 External Validation</div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#2c3e50' }}>
              CASA-Net tier classifications agree with India's official CGWB 2023 status
              for <strong>50% of districts</strong> — vs 44.7% agreement for raw sensor data.
              Divergences are structural: delta districts show CGWB over-exploitation
              despite shallow depth (extraction vs depth measurement gap).
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8f9fa',
                      borderRadius: 6, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
          <strong>v6 improvements over v4:</strong>&nbsp;
          Huber loss reduced gradient dominance by deep districts (+0.032 RMSE gain) ·
          Lagged GW depth added explicit anchor (+0.019) ·
          Residual ARIMA connection fixed direction accuracy (33.3% → 83.3% depleting years).
        </div>
      </div>

      {/* Monthly model section */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">CASA-Net 4b — Monthly Seasonal Model</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#2c3e50', marginBottom: 12 }}>
          A companion monthly model trained on 24-month sliding windows with weighted crop
          intensity curves (peak demand at transplanting, tapering through growing season).
          Enables seasonal intervention timing — not just "where" but "when" to act.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { h: '1-month',  rmse: 0.754, r: 0.942 },
            { h: '3-month',  rmse: 1.067, r: 0.886 },
            { h: '6-month',  rmse: 1.735, r: 0.715 },
            { h: '12-month', rmse: 1.755, r: 0.763 },
          ].map(({ h, rmse: r, r: corr }) => (
            <div key={h} style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px',
                                  textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#7f8c8d', fontWeight: 600,
                            textTransform: 'uppercase', marginBottom: 4 }}>{h} ahead</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>{r}m</div>
              <div style={{ fontSize: 10, color: '#aaa' }}>RMSE · r={corr}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SHAP plots */}
      <ImageCard
        title="Global Feature Importance (SHAP Beeswarm)"
        description="Features ranked by mean absolute SHAP value across all 38 districts. Red = high feature value, blue = low. Shows which variables drive GW depth predictions most strongly."
        src={DATA_FILES.shap_beeswarm}
        alt="SHAP beeswarm"
      />
      <ImageCard
        title="District-Adaptive Gate Weights"
        description="How much each district relied on each CASA-Net stream (Crop-Attention vs LSTM). Districts above 0.5 on LSTM weighted sequential history; below 0.5 weighted crop patterns more."
        src={DATA_FILES.gate_weights_chart}
        alt="Gate weights"
      />
      <ImageCard
        title="SHAP Validation: Attribution vs Historical Correlation"
        description="SHAP-derived crop importance (y-axis) vs historical Pearson correlation attribution (x-axis). Points near the diagonal: both methods independently identify the same crop as a GW stress driver."
        src={DATA_FILES.shap_validation}
        alt="SHAP validation"
      />

      {/* Architecture */}
      <div className="card">
        <div className="card-title">CASA-Net v6 Architecture</div>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: '#2c3e50' }}>
          <p style={{ marginBottom: 10 }}>
            Three-stream architecture: ARIMA trend layer, LSTM seasonal memory, and
            crop-GW cross-attention layer processed simultaneously.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>ARIMA stream (residual connection):</strong> Projects ARIMA baseline
            directly to output as a residual — the model learns the correction on top of
            trend, not depth from scratch. This fixed depleting-year direction accuracy
            from 33.3% to 83.3%.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>Lagged GW depth:</strong> Explicit last-known depth as a 4th input,
            per-district scaled. Anchors short-term predictions to current aquifer state.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>Crop-attention stream:</strong> Cross-attention between crop area shares
            (query) and LSTM hidden states (key/value). Learns which crop-water demand
            patterns are most predictive for each district.
          </p>
          <p>
            <strong>Gating network:</strong> Blends crop and LSTM streams with per-district
            learned weights. Average weights: w_crop=0.382, w_lstm=0.618 —
            sequential GW history dominant, crop patterns provide meaningful refinement.
          </p>
        </div>
      </div>
    </div>
  )
}