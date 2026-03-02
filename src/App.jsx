import React, { useState, useEffect, useCallback } from 'react'
import { loadAllData } from './utils/dataLoader'
import Header from './components/Header'
import MapView from './components/MapView'
import DistrictPanel from './components/DistrictPanel'
import PriorityTable from './components/PriorityTable'
import ScenarioPlanner from './components/ScenarioPlanner'
import ModelView from './components/ModelView'
import SeasonalMap from './components/SeasonalMap'
import DistrictDeepDive from './components/DistrictDeepDive'

export default function App() {
  const [data,             setData]             = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [activeTab,        setActiveTab]        = useState('map')
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [panelOpen,        setPanelOpen]        = useState(false)

  useEffect(() => {
    loadAllData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectDistrict = useCallback((district) => {
    setSelectedDistrict(district)
    setActiveTab('map')
    setPanelOpen(true)
  }, [])

  const handleMapSelect = useCallback((district) => {
    setSelectedDistrict(district)
    setPanelOpen(true)
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <h2>Loading dashboard data</h2>
        <p style={{ fontSize: 13 }}>Reading outputs from public/data/</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Data load failed</h2>
        <p style={{ marginBottom: 12, fontSize: 13 }}>
          Could not load required files from <code>public/data/</code>.
        </p>
        <pre>{error}</pre>
      </div>
    )
  }

  const districtData = selectedDistrict ? data.byDistrict[selectedDistrict] : null
  const cropRecData  = selectedDistrict ? data.cropRecByDistrict?.[selectedDistrict] : null

  return (
    <>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-layout">

        {/* Tab 1: Annual GW Map */}
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
            {panelOpen && selectedDistrict && (
              <div className="panel-backdrop" onClick={() => setPanelOpen(false)} />
            )}
            <DistrictPanel
              district={selectedDistrict}
              districtData={districtData}
              cropRecData={cropRecData}
              gwHistory={data.gwHistory}
              onOpenPolicy={(d) => { setSelectedDistrict(d); setActiveTab('deepdive') }}
              panelOpen={panelOpen}
              onClose={() => setPanelOpen(false)}
            />
          </>
        )}

        {/* Tab 2: Seasonal Crop Map */}
        {activeTab === 'seasonal' && (
          <SeasonalMap
            geojson={data.geojson}
            seasonalByDistrict={data.seasonalByDistrict}
            monthlyByDistrict={data.monthlyByDistrict}
          />
        )}

        {/* Tab 3: District Deep Dive */}
        {activeTab === 'deepdive' && (
          <div className="page-container" style={{ overflowY: 'auto', flex: 1 }}>
            <DistrictDeepDive
              byDistrict={data.byDistrict}
              gwHistory={data.gwHistory}
              monthlyByDistrict={data.monthlyByDistrict}
              seasonalByDistrict={data.seasonalByDistrict}
              cropRecByDistrict={data.cropRecByDistrict}
            />
          </div>
        )}

        {/* Tab 4: Priority Districts */}
        {activeTab === 'priorities' && (
          <PriorityTable
            districtTiers={data.policySummary}
            onSelectDistrict={handleSelectDistrict}
          />
        )}

        {/* Tab 5: Scenarios */}
        {activeTab === 'scenarios' && (
          <ScenarioPlanner
            floodByDistrict={data.floodByDistrict}
            droughtByDistrict={data.droughtByDistrict}
            byDistrict={data.byDistrict}
          />
        )}

        {/* Tab 6: Model Evaluation */}
        {activeTab === 'model' && (
          <ModelView modelMetrics={data.modelMetrics} />
        )}

      </main>
    </>
  )
}