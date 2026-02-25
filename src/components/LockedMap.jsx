import React, { useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet'
import { featureColor } from '../utils/colors'
import { TIER_COLORS } from '../config'

export default function LockedMap({ geojson, byDistrict, selectedDistrict, onSelectDistrict }) {
  const styleFeature = useCallback((feature) => {
    const name     = feature.properties?.dtname || feature.properties?.District
    const props    = byDistrict[name] || feature.properties
    const selected = name === selectedDistrict

    return {
      fillColor  : featureColor(props, 'tier'),
      fillOpacity: selected ? 0.95 : 0.72,
      color      : selected ? '#1c2e4a' : '#ffffff',
      weight     : selected ? 2.5 : 1,
    }
  }, [byDistrict, selectedDistrict])

  const onEachFeature = useCallback((feature, layer) => {
    const name  = feature.properties?.dtname || feature.properties?.District
    const props = byDistrict[name] || {}

    layer.on({
      click    : () => onSelectDistrict(name),
      mouseover: (e) => e.target.setStyle({ fillOpacity: 0.95, weight: 2 }),
      mouseout : (e) => e.target.setStyle({
        fillOpacity: name === selectedDistrict ? 0.95 : 0.72,
        weight     : name === selectedDistrict ? 2.5 : 1,
      }),
    })

    layer.bindTooltip(
      `<strong>${name}</strong><br/>Tier ${props.Tier || '—'} · ${props.CASA_Pred_1yr?.toFixed(1) || '—'}m`,
      { sticky: true }
    )
  }, [byDistrict, selectedDistrict, onSelectDistrict])

  if (!geojson) return null

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        background: 'white', borderRadius: 8, padding: '10px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase' }}>
          Urgency Tier
        </div>
        {[
          { tier: 1, label: 'Act Now' },
          { tier: 2, label: 'Plan Now' },
          { tier: 3, label: 'Monitor' },
          { tier: 4, label: 'Stable' },
        ].map(({ tier, label }) => (
          <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 12, height: 12, borderRadius: 2,
              background: TIER_COLORS[tier], flexShrink: 0
            }} />
            <span>Tier {tier} — {label}</span>
          </div>
        ))}
      </div>

      {/* Click prompt when no district selected */}
      {!selectedDistrict && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(28,46,74,0.85)', color: 'white',
          borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 600,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          Click a district to generate policy analysis
        </div>
      )}

      <MapContainer
        center={[11.1, 78.6]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        zoomControl={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <GeoJSON
          key={selectedDistrict}
          data={geojson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  )
}