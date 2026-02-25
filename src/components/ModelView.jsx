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