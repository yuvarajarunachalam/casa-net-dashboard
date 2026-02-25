import { DEPTH_COLOR_SCALE, TIER_COLORS, RISK_COLORS } from '../config'

export function depthColor(depth) {
  for (const { threshold, color } of DEPTH_COLOR_SCALE) {
    if (depth < threshold) return color
  }
  return '#c0392b'
}

export function tierColor(tier) {
  return TIER_COLORS[tier] || '#95a5a6'
}

export function riskColor(level) {
  return RISK_COLORS[level] || '#95a5a6'
}

// Returns the fill color for a GeoJSON feature based on the active map mode.
export function featureColor(properties, mode) {
  if (!properties) return '#bdc3c7'
  switch (mode) {
    case 'depth':
      return depthColor(properties.CASA_Pred_1yr || 0)
    case 'flood':
      return riskColor(properties.Flood_Risk)
    case 'drought':
      return riskColor(properties.Drought_Risk)
    case 'tier':
    default:
      return properties.Tier_Color || tierColor(properties.Tier) || '#bdc3c7'
  }
}
