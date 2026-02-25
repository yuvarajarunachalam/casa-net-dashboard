import React from 'react'

const CROP_COLORS = {
  Rice      : '#3498db',
  Groundnut : '#e67e22',
  Maize     : '#f1c40f',
  Jowar     : '#27ae60',
  Bajra     : '#9b59b6',
}

export default function CropMixChart({ districtData }) {
  if (!districtData) return null

  const crops = ['Rice', 'Groundnut', 'Maize', 'Jowar', 'Bajra']
  const entries = crops
    .map(crop => {
      const key = `${crop}_weight`
      const alt = Object.keys(districtData).find(
        k => k.toLowerCase().includes(crop.toLowerCase()) && k.toLowerCase().includes('weight')
      )
      const val = districtData[key] ?? (alt ? districtData[alt] : null)
      return { crop, value: val != null ? Number(val) : 0 }
    })
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value)

  if (!entries.length) {
    return (
      <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
        Crop mix data not available.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(({ crop, value }) => (
        <div key={crop} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 72, fontSize: 11, color: '#555', flexShrink: 0 }}>
            {crop}
          </div>
          <div style={{
            flex: 1, background: '#f0f2f5', borderRadius: 4,
            height: 14, overflow: 'hidden'
          }}>
            <div style={{
              width    : `${Math.min(value * 100, 100)}%`,
              background: CROP_COLORS[crop] || '#95a5a6',
              height   : '100%',
              borderRadius: 4,
              minWidth : value > 0 ? 4 : 0,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ width: 38, fontSize: 11, color: '#555', textAlign: 'right', flexShrink: 0 }}>
            {(value * 100).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  )
}