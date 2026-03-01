import React from 'react'
import { DATA_FILES } from '../config'

function MetricCard({ label, value, unit, note }) {
  return (
    <div className="model-metric-card">
      <div className="model-metric-value">{value}<span style={{ fontSize: 16 }}>{unit}</span></div>
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
      <img
        src={src}
        alt={alt}
        onError={e => {
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'block'
        }}
      />
      <div
        style={{ display: 'none', padding: '20px', color: '#aaa', fontSize: 12, textAlign: 'center' }}
      >
        Image not found — run Script 7 to generate SHAP plots.
      </div>
    </div>
  )
}

export default function ModelView({ modelMetrics }) {
  // Pull CASA-Net test metrics from model_comparison_metrics.csv if available
  const casaRow  = modelMetrics?.find(r => r.Model?.includes('CASA'))
  const arimaRow = modelMetrics?.find(r => r.Model?.includes('ARIMA'))

  const rmse  = casaRow?.['RMSE (m)']  ?? '—'
  const mae   = casaRow?.['MAE (m)']   ?? '—'
  const mape  = casaRow?.['MAPE (%)']  ?? '—'

  const vsArima = (arimaRow?.['RMSE (m)'] && casaRow?.['RMSE (m)'])
    ? ((arimaRow['RMSE (m)'] - casaRow['RMSE (m)']) / arimaRow['RMSE (m)'] * 100).toFixed(1)
    : '—'

  return (
    <div className="page-container">
      <div className="page-title">Model Performance and Explainability</div>
      <div className="page-subtitle">
        CASA-Net test set evaluation (2020–2022, 108 samples) and SHAP feature attribution for 38 districts.
      </div>

      {/* Key metrics row */}
      <div className="model-metrics-row">
        <MetricCard label="Test RMSE" value={rmse === '—' ? '—' : Number(rmse).toFixed(3)} unit={rmse === '—' ? '' : 'm'} note="1yr forecast" />
        <MetricCard label="Test MAE"  value={mae  === '—' ? '—' : Number(mae).toFixed(3)}  unit={mae  === '—' ? '' : 'm'} note="1yr forecast" />
        <MetricCard label="MAPE"      value={mape  === '—' ? '—' : Number(mape).toFixed(1)}  unit={mape  === '—' ? '' : '%'} note="1yr forecast" />
        <MetricCard label="vs ARIMA"  value={vsArima === '—' ? '—' : `+${vsArima}`} unit={vsArima === '—' ? '' : '%'} note="RMSE improvement" />
      </div>

      {/* Global SHAP beeswarm */}
      <ImageCard
        title="Global Feature Importance (SHAP Beeswarm)"
        description="Each point represents one district. Features are ranked by mean absolute SHAP value — the most influential drivers of groundwater depth prediction across all 38 districts. Red points have high feature values; blue points have low values."
        src={DATA_FILES.shap_beeswarm}
        alt="SHAP beeswarm plot"
      />

      {/* Gate weights */}
      <ImageCard
        title="District-Adaptive Gate Weights"
        description="Shows how much each district's prediction relied on each of the three CASA-Net streams: Crop-Attention, LSTM, and ARIMA. Districts above the 0.333 baseline for a given stream weighted that stream more heavily than the others."
        src={DATA_FILES.gate_weights_chart}
        alt="Gate weights chart"
      />

      {/* SHAP vs attribution validation */}
      <ImageCard
        title="SHAP Validation: Model Attribution vs Historical Correlation"
        description="Compares SHAP-derived crop importance scores (y-axis) against historical Pearson correlation attribution from Script 5 (x-axis). Points close to the diagonal indicate both methods independently identify the same crop as a groundwater stress driver for that district."
        src={DATA_FILES.shap_validation}
        alt="SHAP vs attribution validation scatter"
      />

      {/* Evaluation reasoning — what these numbers actually mean */}
      <div className="card">
        <div className="card-title">What These Metrics Mean in Practice</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 12 }}>

          <div style={{ background: '#f0f7ff', borderRadius: 8, padding: '14px 16px', borderLeft: '4px solid #2980b9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a5276', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              RMSE in Context
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#2c3e50' }}>
              RMSE of <strong>1.319m</strong> across 38 districts with GW depths ranging 1.5m–13m
              represents <strong>~11% of the measurement range</strong> — comparable to published LSTM
              models (0.60–1.98m, Sun et al. 2022). Critically, this is a harder task: simultaneous
              1-year-ahead forecast across heterogeneous districts, not single-well monthly prediction.
            </div>
          </div>

          <div style={{ background: '#f0fff4', borderRadius: 8, padding: '14px 16px', borderLeft: '4px solid #27ae60' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e8449', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Spearman 0.961 — The Policy Number
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#2c3e50' }}>
              For a planning tool, ranking districts by urgency matters more than exact depth.
              A Spearman correlation of <strong>0.961 (p&lt;0.0001)</strong> means the model
              orders all 38 districts in near-perfect urgency sequence — the right districts
              receive intervention first, with <strong>zero Tier 1→Tier 3 misclassifications</strong>.
            </div>
          </div>

          <div style={{ background: '#fff8f0', borderRadius: 8, padding: '14px 16px', borderLeft: '4px solid #e67e22' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a04000', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              External Validation — CGWB 2023
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#2c3e50' }}>
              CASA-Net tier classifications agree with India's Central Ground Water Board (CGWB 2023)
              official status for <strong>55.3% of districts</strong> — higher than the 44.7% agreement
              between raw sensor data and CGWB. Divergences are structural: delta districts
              (e.g. Thanjavur) show CGWB over-exploitation by volume despite shallow depth, while
              hard-rock districts (e.g. Coimbatore) align on both metrics.
            </div>
          </div>

        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
          <strong>Benchmark comparison:</strong>&nbsp;
          CASA-Net RMSE 1.319m beats Naive baseline (1.923m), ARIMA (2.160m), and standalone LSTM (1.439m)
          on a fair 1-year-ahead task. The Spearman ranking metric is operationally more relevant than
          RMSE for district-level policy decisions.
        </div>
      </div>

      {/* Architecture explanation */}
      <div className="card">
        <div className="card-title">How CASA-Net Works</div>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: '#2c3e50' }}>
          <p style={{ marginBottom: 10 }}>
            CASA-Net is a three-stream architecture that processes groundwater depth
            through an ARIMA trend layer, an LSTM seasonal memory layer, and a crop-GW
            cross-attention layer simultaneously.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>ARIMA stream:</strong> Captures the long-term structural depletion trend
            and the non-linear residuals that trend alone cannot explain. Useful for
            drought-prone districts where depletion follows a slow, multi-decade decline.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>LSTM stream:</strong> Trained on 12-month sliding windows covering a
            full monsoon cycle. Encodes seasonal GW recharge and depletion patterns into
            a 32-dimensional hidden state.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>Crop-attention stream:</strong> Uses each district's crop area share
            vector as a query against the LSTM hidden state. Identifies which crop-water
            demand patterns are most associated with GW stress in that district.
          </p>
          <p>
            <strong>Gating network:</strong> Learns per-district weights that blend the three
            streams. Canal-fed districts converge to higher LSTM weight; drought-prone
            districts to higher ARIMA weight; crop-driven districts to higher attention weight.
          </p>
        </div>
      </div>
    </div>
  )
}