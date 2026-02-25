import React from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts'

// Custom tooltip shown on hover over the chart
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #dde3ea',
      borderRadius: 6, padding: '8px 12px', fontSize: 12
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(2)}m
        </div>
      ))}
    </div>
  )
}

export default function GWChart({ history }) {
  if (!history?.length) {
    return <div className="text-muted text-sm" style={{ padding: '20px 0' }}>No historical data available.</div>
  }

  // Split into observed and predicted series for different line styles
  const observed  = history.filter(d => !d.predicted)
  const predicted = history.filter(d => d.predicted)

  // Combine for a single x-axis domain
  const allData   = [...observed, ...predicted].sort((a, b) => a.year - b.year)

  // The junction year (last observed) gets a point in both series for visual continuity
  const lastObs   = observed[observed.length - 1]
  const predData  = lastObs ? [lastObs, ...predicted] : predicted

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={allData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', offset: 14, style: { fontSize: 10 } }}
          reversed={true}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Vertical line marking transition from observed to forecast */}
        {lastObs && (
          <ReferenceLine
            x={lastObs.year}
            stroke="#aaa"
            strokeDasharray="4 3"
            label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 10, fill: '#999' }}
          />
        )}

        {/* Observed historical GW depth */}
        <Line
          data={observed}
          dataKey="gw_may"
          name="Observed GW depth"
          stroke="#2980b9"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          connectNulls
        />

        {/* CASA-Net predicted depth */}
        <Line
          data={predData}
          dataKey="gw_may"
          name="CASA-Net forecast"
          stroke="#c0392b"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3, fill: '#c0392b' }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
