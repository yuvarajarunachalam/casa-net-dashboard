import React from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'

// Custom tooltip — only shows non-null values
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const items = payload.filter(p => p.value != null)
  if (!items.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #dde3ea',
      borderRadius: 6, padding: '8px 12px', fontSize: 12
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {items.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(2)}m
        </div>
      ))}
    </div>
  )
}

export default function GWChart({ history }) {
  if (!history?.length) {
    return (
      <div className="text-muted text-sm" style={{ padding: '20px 0' }}>
        No historical data available.
      </div>
    )
  }

  // Separate observed and predicted points
  const observed  = history.filter(d => !d.predicted).sort((a, b) => a.year - b.year)
  const predicted = history.filter(d =>  d.predicted).sort((a, b) => a.year - b.year)
  const lastObs   = observed[observed.length - 1]

  // Build a single unified array sorted by year.
  // Each entry has gw_observed and/or gw_predicted — null where absent.
  // The junction year appears in BOTH keys so both lines connect at that point.
  const yearMap = {}

  for (const d of observed) {
    yearMap[d.year] = { year: d.year, gw_observed: d.gw_may, gw_predicted: null }
  }

  // Junction point: last observed value appears in both series
  if (lastObs) {
    yearMap[lastObs.year].gw_predicted = lastObs.gw_may
  }

  for (const d of predicted) {
    if (yearMap[d.year]) {
      yearMap[d.year].gw_predicted = d.gw_may
    } else {
      yearMap[d.year] = { year: d.year, gw_observed: null, gw_predicted: d.gw_may }
    }
  }

  const chartData = Object.values(yearMap).sort((a, b) => a.year - b.year)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          reversed={true}
          label={{
            value: 'Depth (m)', angle: -90,
            position: 'insideLeft', offset: 14,
            style: { fontSize: 10 }
          }}
        />
        <Tooltip content={<CustomTooltip />} />

        {lastObs && (
          <ReferenceLine
            x={lastObs.year}
            stroke="#aaa"
            strokeDasharray="4 3"
            label={{
              value: 'Forecast →',
              position: 'insideTopRight',
              fontSize: 10, fill: '#999'
            }}
          />
        )}

        {/* Observed historical GW depth — solid blue line */}
        <Line
          dataKey="gw_observed"
          name="Observed GW depth"
          stroke="#2980b9"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />

        {/* CASA-Net forecast — dashed red line starting from last observed point */}
        <Line
          dataKey="gw_predicted"
          name="CASA-Net forecast"
          stroke="#c0392b"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3, fill: '#c0392b' }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}