import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { TIER_COLORS, TIER_LABELS } from '../config'
import { useNarrative } from '../hooks/useNarrative'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CROPS  = ['Rice','Groundnut','Jowar','Bajra','Maize']
const CROP_COLORS = {
  Rice: '#3498db', Groundnut: '#e67e22', Jowar: '#27ae60',
  Bajra: '#9b59b6', Maize: '#f1c40f',
}
const MONSOON_MONTHS = [6, 7, 8, 9]  // Jun–Sep Northeast + Southwest monsoon

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#7f8c8d',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      marginBottom: 10, paddingBottom: 6,
      borderBottom: '1px solid #e8ecf0',
    }}>
      {children}
    </div>
  )
}

function StatCard({ label, value, unit, color, note }) {
  return (
    <div style={{
      background: '#f8f9fa', borderRadius: 8, padding: '12px 14px',
      borderLeft: `3px solid ${color || '#2980b9'}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#7f8c8d',
                    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#2c3e50', lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, color: '#7f8c8d', marginLeft: 3 }}>{unit}</span>}
      </div>
      {note && <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{note}</div>}
    </div>
  )
}

// GW historical + forecast chart with monsoon bands
function GWHistoryChart({ gwHistory, district }) {
  const history = gwHistory?.[district] || []
  if (!history.length) return <div style={{ color: '#aaa', fontSize: 12, padding: 12 }}>No data</div>

  const data = [...history].sort((a, b) => a.year - b.year)
  const splitYear = data.find(d => d.predicted)?.year - 1

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
        <YAxis
          reversed
          tick={{ fontSize: 10 }}
          label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fontSize: 10 }}
        />
        <Tooltip
          formatter={(v, name) => [`${v?.toFixed(2)}m`, name === 'gw_may' ? 'Actual' : 'Forecast']}
          labelFormatter={l => `Year ${l}`}
          contentStyle={{ fontSize: 11 }}
        />
        {splitYear && (
          <ReferenceLine x={splitYear} stroke="#aaa" strokeDasharray="4 2"
            label={{ value: 'Forecast →', position: 'top', fontSize: 10, fill: '#aaa' }} />
        )}
        <Line
          type="monotone" dataKey="gw_may" stroke="#2980b9" strokeWidth={2}
          dot={d => !d.payload?.predicted}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Monthly depth chart from 4b model
function MonthlyDepthChart({ monthlyData }) {
  if (!monthlyData?.length) return null

  const byMonth = {}
  for (const row of monthlyData) {
    const m = row.Month
    if (!byMonth[m]) byMonth[m] = []
    const val = row.Pred_1m ?? row.GW_Actual
    if (val != null) byMonth[m].push(+val)
  }

  const chartData = MONTHS.map((name, i) => {
    const m    = i + 1
    const vals = byMonth[m] || []
    const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { month: name, depth: avg ? +avg.toFixed(2) : null, monsoon: MONSOON_MONTHS.includes(m) }
  })

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis
          reversed tick={{ fontSize: 10 }}
          label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fontSize: 10 }}
        />
        <Tooltip formatter={(v) => [`${v}m`, 'Avg Depth']} contentStyle={{ fontSize: 11 }} />
        <Bar dataKey="depth" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.monsoon ? '#3498db' : entry.depth > 8 ? '#c0392b' : entry.depth > 5 ? '#e67e22' : '#27ae60'}
              opacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Crop area bar chart
function CropAreaChart({ districtData }) {
  if (!districtData) return null
  const data = CROPS.map(c => ({
    crop : c,
    area : districtData[`${c}_weight`]
      ? +(districtData[`${c}_weight`] * 100).toFixed(1)
      : 0,
  })).filter(d => d.area > 0.5).sort((a, b) => b.area - a.area)

  if (!data.length) return <div style={{ color: '#aaa', fontSize: 12 }}>No crop data</div>

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
        <YAxis type="category" dataKey="crop" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${v}%`, 'Area share']} contentStyle={{ fontSize: 11 }} />
        <Bar dataKey="area" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={CROP_COLORS[entry.crop] || '#95a5a6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// MSP × Yield revenue table
function MSPRevenueSection({ districtData, cropRecData }) {
  const MSP = { Rice: 2183, Groundnut: 6377, Jowar: 3180, Bajra: 2500, Maize: 2090 }
  const rows = CROPS.map(c => ({
    crop    : c,
    share   : districtData?.[`${c}_weight`] ? +(districtData[`${c}_weight`] * 100).toFixed(1) : 0,
    msp     : MSP[c],
    revenue : districtData?.[`Rev_${c}`] != null
              ? +(districtData[`Rev_${c}`]).toFixed(2)
              : null,
  })).filter(d => d.share > 0.5).sort((a, b) => b.share - a.share)

  if (!rows.length) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {['Crop','Area Share','MSP (₹/qtl)','Rev Score'].map(h => (
              <th key={h} style={{ padding: '7px 10px', textAlign: 'left',
                                   borderBottom: '2px solid #e8ecf0', fontWeight: 600,
                                   fontSize: 11, color: '#7f8c8d' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.crop} style={{ background: i % 2 ? '#fafbfc' : 'white' }}>
              <td style={{ padding: '6px 10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2,
                                 background: CROP_COLORS[r.crop], display: 'inline-block' }} />
                  {r.crop}
                </span>
              </td>
              <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.share}%</td>
              <td style={{ padding: '6px 10px' }}>₹{r.msp.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px 10px', color: r.revenue > 0.6 ? '#27ae60' : '#e67e22', fontWeight: 600 }}>
                {r.revenue != null ? r.revenue.toFixed(2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>
        Revenue score = normalised MSP × Yield index (0–1). Higher = stronger economic incentive to grow this crop.
      </div>
    </div>
  )
}

export default function DistrictDeepDive({
  byDistrict, gwHistory, monthlyByDistrict, seasonalByDistrict, cropRecByDistrict,
}) {
  const districts = Object.keys(byDistrict).sort()
  const [selected, setSelected] = useState(districts[0] || '')

  const districtData = byDistrict[selected]
  const calRow       = seasonalByDistrict?.[selected]
  const monthlyData  = monthlyByDistrict?.[selected] || []
  const cropRecData  = cropRecByDistrict?.[selected]

  const { narrative, loading, fetchNarrative } = useNarrative()

  useEffect(() => {
    if (districtData) fetchNarrative(districtData, cropRecData)
  }, [selected, districtData, cropRecData, fetchNarrative])

  if (!districtData) return null

  const tierColor = TIER_COLORS[districtData.Tier] || '#95a5a6'
  const trend     = districtData.GW_Trend_m_per_yr || 0

  return (
    <div className="page-container" style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* District selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
                    flexWrap: 'wrap' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>District Deep Dive</div>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{
            padding: '7px 14px', borderRadius: 6, border: '1px solid #dde3ea',
            fontSize: 13, fontWeight: 600, background: 'white', cursor: 'pointer',
            color: '#2c3e50', minWidth: 180,
          }}
        >
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{
          background: tierColor, color: 'white', borderRadius: 12,
          padding: '4px 12px', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>
          Tier {districtData.Tier} — {TIER_LABELS[districtData.Tier]}
        </span>
      </div>

      {/* Key stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12, marginBottom: 24 }}>
        <StatCard label="Depth 1yr" value={districtData.CASA_Pred_1yr?.toFixed(2)} unit="m"
          color={tierColor} note="CASA-Net v6 forecast" />
        <StatCard label="Depth 3yr" value={districtData.CASA_Pred_3yr?.toFixed(2)} unit="m"
          color="#e67e22" />
        <StatCard label="Depth 5yr" value={districtData.CASA_Pred_5yr?.toFixed(2)} unit="m"
          color={trend > 0 ? '#c0392b' : '#27ae60'} />
        <StatCard label="GW Trend"
          value={trend > 0 ? `+${trend.toFixed(3)}` : trend.toFixed(3)} unit="m/yr"
          color={trend > 0.1 ? '#c0392b' : trend < -0.05 ? '#27ae60' : '#e67e22'}
          note={trend > 0.05 ? 'Depleting' : trend < -0.05 ? 'Recovering' : 'Stable'} />
        <StatCard label="GW Dependency" value={Math.round((districtData.GW_Dep_Ratio || 0) * 100)}
          unit="%" color="#2980b9" note="of irrigation" />
        {calRow && (
          <StatCard label="Peak Stress"
            value={calRow.Peak_Stress_Month}
            color="#9b59b6"
            note={`${calRow.Seasonal_Range_m}m seasonal range`} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Historical GW + forecast */}
          <div className="card">
            <SectionTitle>Historical GW Depth + CASA-Net Forecast (Annual)</SectionTitle>
            <GWHistoryChart gwHistory={gwHistory} district={selected} />
          </div>

          {/* Monthly seasonal pattern */}
          {monthlyData.length > 0 && (
            <div className="card">
              <SectionTitle>Monthly Seasonal Pattern (CASA-Net 4b)</SectionTitle>
              <MonthlyDepthChart monthlyData={monthlyData} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#3498db',
                                 borderRadius: 2, display: 'inline-block' }} />
                  Monsoon months
                </span>
                <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#c0392b',
                                 borderRadius: 2, display: 'inline-block' }} />
                  Critical depth
                </span>
                <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#27ae60',
                                 borderRadius: 2, display: 'inline-block' }} />
                  Low stress
                </span>
              </div>
            </div>
          )}

          {/* Contingency risk */}
          <div className="card">
            <SectionTitle>Contingency Risk</SectionTitle>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Flood Risk',   val: districtData.Flood_Risk },
                { label: 'Drought Risk', val: districtData.Drought_Risk },
              ].map(({ label, val }) => {
                const c = val === 'HIGH' ? '#c0392b' : val === 'MEDIUM' ? '#e67e22' : '#27ae60'
                return (
                  <div key={label} style={{ flex: 1, background: c + '18', borderRadius: 8,
                                            padding: '10px 14px', border: `1px solid ${c}40` }}>
                    <div style={{ fontSize: 10, color: '#7f8c8d', fontWeight: 600,
                                  textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{val || '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Crop area composition */}
          <div className="card">
            <SectionTitle>Crop Area Composition</SectionTitle>
            <CropAreaChart districtData={districtData} />
          </div>

          {/* MSP × Yield analysis */}
          <div className="card">
            <SectionTitle>MSP × Yield — Economic Incentive Analysis</SectionTitle>
            <MSPRevenueSection districtData={districtData} cropRecData={cropRecData} />
          </div>

          {/* Seasonal intervention */}
          {calRow && (
            <div className="card">
              <SectionTitle>Seasonal Intervention Window</SectionTitle>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: '#2c3e50' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, color: '#aaa', display: 'block' }}>Peak Stress</span>
                    <span style={{ fontWeight: 700, color: '#c0392b' }}>
                      {calRow.Peak_Stress_Month} ({calRow.Peak_Depth_m}m)
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#aaa', display: 'block' }}>Recovery</span>
                    <span style={{ fontWeight: 700, color: '#27ae60' }}>
                      {calRow.Recovery_Month} ({calRow.Trough_Depth_m}m)
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#aaa', display: 'block' }}>Best Window</span>
                    <span style={{ fontWeight: 700, color: '#2980b9' }}>
                      {calRow.Intervention_Window}
                    </span>
                  </div>
                </div>
                <div style={{ background: '#eafaf1', borderRadius: 6, padding: '8px 12px',
                              fontSize: 12, color: '#1e8449' }}>
                  Scheme timing: Restrict <strong>{calRow.Dominant_Crop}</strong> during{' '}
                  <strong>{calRow.Intervention_Window}</strong> for maximum aquifer recovery impact.
                </div>
              </div>
            </div>
          )}

          {/* Crop recommendation */}
          <div className="card">
            <SectionTitle>Policy Recommendation</SectionTitle>
            <div style={{
              borderLeft: `3px solid ${
                districtData.Recommendation_Type === 'Switch' ? '#c0392b' :
                districtData.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60'
              }`, paddingLeft: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6,
                            color: districtData.Recommendation_Type === 'Switch' ? '#c0392b' :
                                   districtData.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60' }}>
                {districtData.Recommendation_Type} — {districtData.Recommended_Crop || 'Maintain'}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: '#2c3e50' }}>
                {districtData.Recommendation_Text}
              </div>
              {districtData.Potential_Water_Saving_pct > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#27ae60', fontWeight: 600 }}>
                  Potential water saving: {districtData.Potential_Water_Saving_pct?.toFixed(1)}%
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* AI Policy Brief — full width */}
      <div className="card" style={{ marginTop: 20 }}>
        <SectionTitle>AI Policy Brief</SectionTitle>
        {loading ? (
          <div style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic' }}>
            Generating district analysis...
          </div>
        ) : (
          <p style={{ fontSize: 13, lineHeight: 1.8, color: '#2c3e50', margin: 0 }}>
            {narrative || 'Select a district to generate AI policy brief.'}
          </p>
        )}
      </div>

    </div>
  )
}