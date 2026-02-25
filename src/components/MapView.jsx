import React, { useState, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet'
import { featureColor, tierColor, riskColor, depthColor } from '../utils/colors'
import { TIER_LABELS, TIER_COLORS, RISK_COLORS } from '../config'

const MAP_MODES = [
  { id: 'tier',    label: 'Urgency Tier' },
  { id: 'depth',   label: 'GW Depth (1yr)' },
  { id: 'flood',   label: 'Flood Risk' },
  { id: 'drought', label: 'Drought Risk' },
]

// Leaflet fix for default marker icons broken by Vite bundling
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl      : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl    : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function Legend({ mode }) {
  const items = mode === 'tier'
    ? Object.entries(TIER_LABELS).map(([tier, label]) => ({
        color: TIER_COLORS[tier], label: `Tier ${tier} — ${label}`
      }))
    : mode === 'depth'
    ? [
        { color: '#27ae60', label: '< 3m (stable)' },
        { color: '#f1c40f', label: '3 – 5m (low stress)' },
        { color: '#e67e22', label: '5 – 8m (moderate)' },
        { color: '#c0392b', label: '> 8m (critical)' },
      ]
    : Object.entries(RISK_COLORS).map(([level, color]) => ({
        color, label: level
      }))

  return (
    <div className="map-legend">
      <div className="legend-title">{MAP_MODES.find(m => m.id === mode)?.label}</div>
      {items.map(({ color, label }) => (
        <div className="legend-item" key={label}>
          <div className="legend-swatch" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function MapView({ geojson, byDistrict, selectedDistrict, onSelectDistrict }) {
  const [mode, setMode] = useState('tier')

  // Style function called by react-leaflet for each GeoJSON feature
  const styleFeature = useCallback((feature) => {
    const name     = feature.properties?.dtname || feature.properties?.District
    const props    = byDistrict[name] || feature.properties
    const selected = name === selectedDistrict
    const color    = featureColor(props, mode)

    return {
      fillColor  : color,
      fillOpacity: selected ? 0.95 : 0.72,
      color      : selected ? '#1c2e4a' : '#ffffff',
      weight     : selected ? 2.5 : 1,
    }
  }, [byDistrict, mode, selectedDistrict])

  // Event handlers bound to each GeoJSON feature
  const onEachFeature = useCallback((feature, layer) => {
    const name  = feature.properties?.dtname || feature.properties?.District
    const props = byDistrict[name] || {}

    layer.on({
      click     : () => onSelectDistrict(name),
      mouseover : (e) => e.target.setStyle({ fillOpacity: 0.95, weight: 2 }),
      mouseout  : (e) => e.target.setStyle({
        fillOpacity: name === selectedDistrict ? 0.95 : 0.72,
        weight     : name === selectedDistrict ? 2.5 : 1,
      }),
    })

    // Tooltip shown on hover
    const depth = props.CASA_Pred_1yr?.toFixed(2) ?? '—'
    const tier  = props.Tier ? `Tier ${props.Tier}` : '—'
    const rec   = props.Recommended_Crop ?? '—'
    layer.bindTooltip(
      `<strong>${name}</strong><br/>
       Depth (1yr): ${depth}m<br/>
       ${tier} &mdash; Rec: ${rec}`,
      { sticky: true, className: 'leaflet-tooltip-custom' }
    )
  }, [byDistrict, selectedDistrict, onSelectDistrict])

  if (!geojson) return null

  return (
    <div className="map-container">
      {/* Mode selector */}
      <div className="map-controls">
        <label>Colour by</label>
        {MAP_MODES.map(m => (
          <button
            key={m.id}
            className={`map-mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Legend mode={mode} />

      <MapContainer
        center={[11.1, 78.6]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <GeoJSON
          key={mode + selectedDistrict}
          data={geojson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  )
}
