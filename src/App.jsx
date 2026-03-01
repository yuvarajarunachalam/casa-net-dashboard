import React, { useState, useEffect, useCallback } from 'react'
import { loadAllData } from './utils/dataLoader'
import Header from './components/Header'
import MapView from './components/MapView'
import DistrictPanel from './components/DistrictPanel'
import PriorityTable from './components/PriorityTable'
import ScenarioPlanner from './components/ScenarioPlanner'
import ModelView from './components/ModelView'
import PolicyPage from './components/PolicyPage'

export default function App() {
  const [data,             setData]             = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [activeTab,        setActiveTab]        = useState('map')
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  // Mobile: controls whether the district panel drawer is open
  const [panelOpen,        setPanelOpen]        = useState(false)

  // Load all CSV and GeoJSON data once on mount
  useEffect(() => {
    loadAllData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Clicking a district on the priority table navigates to the map tab
  const handleSelectDistrict = useCallback((district) => {
    setSelectedDistrict(district)
    setActiveTab('map')
    setPanelOpen(true)
  }, [])

  // Clicking a district on the map opens the panel
  const handleMapSelect = useCallback((district) => {
    setSelectedDistrict(district)
    setPanelOpen(true)
  }, [])

  // Navigate directly to Policy Analysis for a given district
  const handleOpenPolicy = useCallback((district) => {
    setSelectedDistrict(district)
    setActiveTab('policy')
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <h2>Loading dashboard data</h2>
        <p style={{ fontSize: 13 }}>
          Reading outputs from public/data/ &mdash; make sure you copied your outputs/ files there.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Data load failed</h2>
        <p style={{ marginBottom: 12, fontSize: 13 }}>
          Could not load one or more required files from <code>public/data/</code>.
          Check that you have copied all files from your <code>outputs/</code> folder.
        </p>
        <pre>{error}</pre>
        <p style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
          Required: policy_summary.csv, district_tiers.csv, enriched_districts.geojson
        </p>
      </div>
    )
  }

  const districtData = selectedDistrict ? data.byDistrict[selectedDistrict] : null
  const cropRecData  = selectedDistrict ? data.cropRecByDistrict?.[selectedDistrict] : null

  return (
    <>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-layout">

        {/* Map tab — map with district panel sidebar */}
        {activeTab === 'map' && (
          <>
            <div className={`map-wrapper${panelOpen && selectedDistrict ? ' map-panel-open' : ''}`}>
              <MapView
                geojson={data.geojson}
                byDistrict={data.byDistrict}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={handleMapSelect}
              />
            </div>

            {/* Mobile panel overlay backdrop */}
            {panelOpen && selectedDistrict && (
              <div
                className="panel-backdrop"
                onClick={() => setPanelOpen(false)}
              />
            )}

            <DistrictPanel
              district={selectedDistrict}
              districtData={districtData}
              cropRecData={cropRecData}
              gwHistory={data.gwHistory}
              onOpenPolicy={handleOpenPolicy}
              panelOpen={panelOpen}
              onClose={() => setPanelOpen(false)}
            />
          </>
        )}

        {/* Priority Districts tab */}
        {activeTab === 'priorities' && (
          <PriorityTable
            districtTiers={data.policySummary}
            onSelectDistrict={handleSelectDistrict}
          />
        )}

        {/* Scenario Planning tab */}
        {activeTab === 'scenarios' && (
          <ScenarioPlanner
            floodByDistrict={data.floodByDistrict}
            droughtByDistrict={data.droughtByDistrict}
            byDistrict={data.byDistrict}
          />
        )}

        {/* Model and Explainability tab */}
        {activeTab === 'model' && (
          <ModelView modelMetrics={data.modelMetrics} />
        )}

        {/* Policy Analysis tab */}
        {activeTab === 'policy' && (
          <PolicyPage
            geojson={data.geojson}
            byDistrict={data.byDistrict}
            policySummary={data.policySummary}
            cropRecByDistrict={data.cropRecByDistrict}
          />
        )}

      </main>
    </>
  )
}