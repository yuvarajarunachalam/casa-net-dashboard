import React, { useState, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl      : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl    : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CROP_COLORS = {
  Rice: '#3498db', Groundnut: '#e67e22', Jowar: '#27ae60',
  Bajra: '#9b59b6', Maize: '#f1c40f',
}

// Colour by peak stress month — warm = pre-monsoon peak, cool = post-monsoon
function peakMonthColor(monthName) {
  const idx = MONTHS.indexOf(monthName)
  const palette = [
    '#4a90d9','#3a7fc1','#2ecc71','#27ae60',
    '#e74c3c','#c0392b','#e67e22','#d35400',
    '#f39c12','#8e44ad','#2980b9','#1abc9c',
  ]
  return palette[idx] ?? '#95a5a6'
}

function SeasonalLegend() {
  return (
    <div className="map-legend">
      <div className="legend-title">Peak Stress Month</div>
      {MONTHS.map((m, i) => (
        <div className="legend-item" key={m}>
          <div className="legend-swatch" style={{ background: peakMonthColor(m) }} />
          <span>{m}</span>
        </div>
      ))}
    </div>
  )
}

// 12-month stress curve chart
function StressCurveChart({ monthlyData, district, peakMonth, recoveryMonth }) {
  if (!monthlyData?.length) return null

  // Average Pred_1m by month across all years
  const byMonth = {}
  for (const row of monthlyData) {
    const m = row.Month
    if (!byMonth[m]) byMonth[m] = []
    if (row.Pred_1m != null) byMonth[m].push(row.Pred_1m)
    else if (row.GW_Actual != null) byMonth[m].push(row.GW_Actual)
  }

  const chartData = MONTHS.map((name, i) => {
    const m    = i + 1
    const vals = byMonth[m] || []
    const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { month: name, depth: avg ? +avg.toFixed(2) : null }
  }).filter(d => d.depth != null)

  const peakIdx     = MONTHS.indexOf(peakMonth)
  const recoveryIdx = MONTHS.indexOf(recoveryMonth)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis
          reversed
          tick={{ fontSize: 10 }}
          label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fontSize: 10 }}
        />
        <Tooltip
          formatter={(v) => [`${v}m`, 'Avg GW Depth']}
          labelStyle={{ fontWeight: 700, fontSize: 12 }}
          contentStyle={{ fontSize: 11 }}
        />
        {peakIdx >= 0 && (
          <ReferenceLine
            x={MONTHS[peakIdx]}
            stroke="#c0392b"
            strokeDasharray="4 2"
            label={{ value: 'Peak', position: 'top', fontSize: 10, fill: '#c0392b' }}
          />
        )}
        {recoveryIdx >= 0 && (
          <ReferenceLine
            x={MONTHS[recoveryIdx]}
            stroke="#27ae60"
            strokeDasharray="4 2"
            label={{ value: 'Recovery', position: 'top', fontSize: 10, fill: '#27ae60' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="depth"
          stroke="#2980b9"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2980b9' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// 12-cell calendar heatmap
function CalendarHeatmap({ monthlyData, peakMonth }) {
  if (!monthlyData?.length) return null

  const byMonth = {}
  for (const row of monthlyData) {
    const m = row.Month
    if (!byMonth[m]) byMonth[m] = []
    const val = row.Pred_1m ?? row.GW_Actual
    if (val != null) byMonth[m].push(val)
  }

  const avgs = MONTHS.map((name, i) => {
    const vals = byMonth[i + 1] || []
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })

  const valid  = avgs.filter(v => v != null)
  const minVal = valid.length ? Math.min(...valid) : 0
  const maxVal = valid.length ? Math.max(...valid) : 1
  const range  = maxVal - minVal || 1

  function cellColor(val) {
    if (val == null) return '#f0f2f5'
    const t = (val - minVal) / range  // 0=shallow, 1=deep
    const r = Math.round(39  + t * (192 - 39))
    const g = Math.round(174 + t * (57  - 174))
    const b = Math.round(96  + t * (43  - 96))
    return `rgb(${r},${g},${b})`
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d',
                    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
        Monthly Avg GW Depth Heatmap
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
        {MONTHS.map((m, i) => {
          const val   = avgs[i]
          const isPeak = m === peakMonth
          return (
            <div
              key={m}
              title={val ? `${m}: ${val.toFixed(2)}m` : `${m}: no data`}
              style={{
                background  : cellColor(val),
                borderRadius: 4,
                padding     : '6px 4px',
                textAlign   : 'center',
                border      : isPeak ? '2px solid #c0392b' : '2px solid transparent',
                cursor      : 'default',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {m}
              </div>
              <div style={{ fontSize: 10, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {val ? `${val.toFixed(1)}m` : '—'}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 10, color: '#aaa', marginTop: 4 }}>
        <span>Shallow (low stress)</span>
        <span>Deep (high stress)</span>
      </div>
    </div>
  )
}

export default function SeasonalMap({
  geojson, seasonalByDistrict, monthlyByDistrict,
}) {
  const [selected, setSelected]   = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const calRow  = selected ? seasonalByDistrict[selected] : null
  const mData   = selected ? (monthlyByDistrict[selected] || []) : []

  const styleFeature = useCallback((feature) => {
    const name = feature.properties?.dtname || feature.properties?.District
    const row  = seasonalByDistrict[name]
    const peak = row?.Peak_Stress_Month
    const color = peak ? peakMonthColor(peak) : '#cccccc'
    return {
      fillColor  : color,
      fillOpacity: name === selected ? 0.95 : 0.75,
      color      : name === selected ? '#1c2e4a' : '#ffffff',
      weight     : name === selected ? 2.5 : 1,
    }
  }, [seasonalByDistrict, selected])

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.dtname || feature.properties?.District
    const row  = seasonalByDistrict[name] || {}
    layer.on({ click: () => { setSelected(name); setPanelOpen(true) } })
    layer.bindTooltip(
      `<strong>${name}</strong><br/>
       Peak: ${row.Peak_Stress_Month || '—'} (${row.Peak_Depth_m ? row.Peak_Depth_m + 'm' : '—'})<br/>
       Recovery: ${row.Recovery_Month || '—'}<br/>
       Range: ${row.Seasonal_Range_m ? row.Seasonal_Range_m + 'm' : '—'}<br/>
       Dominant crop: ${row.Dominant_Crop || '—'}`,
      { sticky: true, className: 'leaflet-tooltip-custom' }
    )
  }, [seasonalByDistrict])

  if (!geojson) return null

  return (
    <div className="main-layout" style={{ position: 'relative' }}>
      <div className={`map-wrapper${panelOpen && selected ? ' map-panel-open' : ''}`}>
        <div className="map-container">
          <SeasonalLegend />
          <MapContainer center={[11.1, 78.6]} zoom={7}
            style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            <GeoJSON
              key={selected}
              data={geojson}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>
      </div>

      {/* Backdrop */}
      {panelOpen && selected && (
        <div className="panel-backdrop" onClick={() => setPanelOpen(false)} />
      )}

      {/* Side / bottom panel */}
      <div className={`district-panel ${panelOpen ? 'panel-open' : ''}`}>
        {!selected || !calRow ? (
          <div className="district-panel-placeholder">
            <p>Click any district to see its seasonal GW stress pattern and crop intervention window.</p>
          </div>
        ) : (
          <>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div className="panel-district-name">{selected}</div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: peakMonthColor(calRow.Peak_Stress_Month),
                    color: 'white', fontSize: 11, fontWeight: 600,
                    padding: '3px 9px', borderRadius: 12,
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                  }}>
                    Peak: {calRow.Peak_Stress_Month} — {calRow.Dominant_Crop}
                  </span>
                </div>
                <button className="panel-close-btn" onClick={() => setPanelOpen(false)}>✕</button>
              </div>
            </div>

            <div className="panel-body">

              {/* Key seasonal stats */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Peak Depth</div>
                  <div className="metric-value">
                    {calRow.Peak_Depth_m}<span className="metric-unit">m</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Recovery Depth</div>
                  <div className="metric-value">
                    {calRow.Trough_Depth_m}<span className="metric-unit">m</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Seasonal Range</div>
                  <div className="metric-value">
                    {calRow.Seasonal_Range_m}<span className="metric-unit">m</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Recovery Month</div>
                  <div className="metric-value" style={{ fontSize: 16 }}>
                    {calRow.Recovery_Month}
                  </div>
                </div>
              </div>

              {/* Intervention window banner */}
              <div style={{
                background: '#fef9e7', border: '1px solid #f9ca24',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7d6608',
                              textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                  Intervention Window
                </div>
                <div style={{ fontSize: 13, color: '#2c3e50', lineHeight: 1.6 }}>
                  Restrict <strong>{calRow.Dominant_Crop}</strong> cultivation in{' '}
                  <strong>{calRow.Intervention_Window}</strong> to reduce peak GW withdrawal.
                  Seasonal range of <strong>{calRow.Seasonal_Range_m}m</strong> means higher
                  intervention impact potential
                  {calRow.Seasonal_Range_m > 2.5 ? ' — this district responds well to seasonal schemes.' : '.'}
                </div>
              </div>

              {/* 12-month stress curve */}
              <div>
                <div className="section-title">Monthly GW Depth — Seasonal Pattern</div>
                <StressCurveChart
                  monthlyData={mData}
                  district={selected}
                  peakMonth={calRow.Peak_Stress_Month}
                  recoveryMonth={calRow.Recovery_Month}
                />
              </div>

              {/* Calendar heatmap */}
              <div>
                <CalendarHeatmap
                  monthlyData={mData}
                  peakMonth={calRow.Peak_Stress_Month}
                />
              </div>

              {/* Crop context */}
              <div>
                <div className="section-title">Why {calRow.Peak_Stress_Month}?</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: '#2c3e50',
                              background: '#f8f9fa', borderRadius: 8, padding: '10px 14px' }}>
                  <strong>{calRow.Dominant_Crop}</strong> is the dominant crop in {selected}{' '}
                  by cultivated area. Its peak water demand (transplanting/sowing) falls in{' '}
                  <strong>{calRow.Peak_Stress_Month}</strong>, driving the seasonal GW low.
                  The {calRow.Seasonal_Range_m}m difference between peak and recovery depth
                  represents the aquifer's natural recharge window — the period where
                  intervention schemes have maximum impact.
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}