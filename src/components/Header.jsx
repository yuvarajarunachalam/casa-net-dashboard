import React, { useState } from 'react'

const TABS = [
  { id: 'map',      label: 'Annual GW Map' },
  { id: 'seasonal', label: 'Seasonal Map' },
  { id: 'deepdive', label: 'District Deep Dive' },
  { id: 'priorities', label: 'Priority Districts' },
  { id: 'scenarios',  label: 'Scenarios' },
  { id: 'model',      label: 'Model Evaluation' },
]

export default function Header({ activeTab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleTab = (id) => {
    onTabChange(id)
    setMenuOpen(false)
  }

  return (
    <header className="header">
      <div className="header-title">
        <h1>CASA-Net</h1>
        <span className="header-subtitle">Tamil Nadu Groundwater Policy Dashboard</span>
      </div>

      {/* Desktop nav */}
      <nav className="header-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`mobile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}