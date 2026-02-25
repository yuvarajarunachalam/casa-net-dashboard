// dataLoader.js
// Handles all data fetching and parsing for the dashboard.
// PapaParse is used for CSV files. GeoJSON is fetched as raw JSON.
// All functions return promises and are safe to call concurrently with Promise.all.

import Papa from 'papaparse'
import { DATA_FILES } from '../config'

// Parse a CSV file from a URL and return an array of objects.
// PapaParse dynamicTyping converts numeric strings to numbers automatically.
async function fetchCSV(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const text = await response.text()
  const result = Papa.parse(text, {
    header       : true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  return result.data
}

async function fetchGeoJSON(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch GeoJSON: ${response.status}`)
  return response.json()
}

// Load all dashboard data in parallel.
// Returns a structured object consumed by App.jsx.
export async function loadAllData() {
  const [
    policySummary,
    districtTiers,
    shapValues,
    floodContingency,
    droughtContingency,
    modelMetrics,
    mergedAnnual,
    casaPredictions,
    geojson,
  ] = await Promise.all([
    fetchCSV(DATA_FILES.policy_summary),
    fetchCSV(DATA_FILES.district_tiers),
    fetchCSV(DATA_FILES.shap_values).catch(() => []),
    fetchCSV(DATA_FILES.flood_contingency),
    fetchCSV(DATA_FILES.drought_contingency),
    fetchCSV(DATA_FILES.model_metrics).catch(() => []),
    fetchCSV(DATA_FILES.merged_annual),
    fetchCSV(DATA_FILES.casa_predictions),
    fetchGeoJSON(DATA_FILES.geojson),
  ])

  // Build a fast lookup dictionary by district name
  const byDistrict = {}
  for (const row of policySummary) {
    if (row.District) byDistrict[row.District] = row
  }

  // Build historical GW series per district for the forecast chart
  // Shape: { "Coimbatore": [{year: 2011, gw_may: 8.2}, ...], ... }
  const gwHistory = {}
  for (const row of mergedAnnual) {
    if (!row.District || row.GW_May == null) continue
    if (!gwHistory[row.District]) gwHistory[row.District] = []
    gwHistory[row.District].push({ year: row.Year, gw_may: row.GW_May })
  }

  // Attach the 3 predicted future points (2023, 2025, 2027 approximately)
  // using the latest prediction row per district from casa_net_predictions.csv
  const latestPred = {}
  for (const row of casaPredictions) {
    if (!latestPred[row.District] || row.Year > latestPred[row.District].Year) {
      latestPred[row.District] = row
    }
  }

  for (const [district, pred] of Object.entries(latestPred)) {
    if (!gwHistory[district]) gwHistory[district] = []
    const baseYear = pred.Year
    gwHistory[district].push({ year: baseYear + 1, gw_may: pred.CASA_Pred_1yr, predicted: true })
    gwHistory[district].push({ year: baseYear + 3, gw_may: pred.CASA_Pred_3yr, predicted: true })
    gwHistory[district].push({ year: baseYear + 5, gw_may: pred.CASA_Pred_5yr, predicted: true })
  }

  // Build flood and drought lookup
  const floodByDistrict = {}
  for (const row of floodContingency) {
    floodByDistrict[row.District] = row
  }

  const droughtByDistrict = {}
  for (const row of droughtContingency) {
    droughtByDistrict[row.District] = row
  }

  // Build SHAP lookup
  const shapByDistrict = {}
  for (const row of shapValues) {
    shapByDistrict[row.District] = row
  }

  return {
    policySummary,
    districtTiers,
    modelMetrics,
    geojson,
    byDistrict,
    gwHistory,
    floodByDistrict,
    droughtByDistrict,
    shapByDistrict,
  }
}
