import React from 'react'

const TABS = [
  { id: 'map',        label: 'Overview Map' },
  { id: 'priorities', label: 'Priority Districts' },
  { id: 'scenarios',  label: 'Scenarios' },
  { id: 'model',      label: 'Model & Explainability' },
]

export default function Header({ activeTab, onTabChange }) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>CASA-Net</h1>
        <span>Tamil Nadu Groundwater Policy Dashboard</span>
      </div>
      <nav className="header-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
