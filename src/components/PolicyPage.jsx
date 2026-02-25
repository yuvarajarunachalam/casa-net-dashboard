import React, { useState, useEffect } from 'react'
import LockedMap from './LockedMap'
import CropMixChart from './CropMixChart'
import ComparableDistricts from './ComparableDistricts'
import { usePolicyDossier } from '../hooks/usePolicyDossier'
import { getSchemesForDistrict, SCHEME_NAMES, getCropPolicy } from '../data/tn_policy_reference'
import { TIER_COLORS, TIER_LABELS, RISK_COLORS } from '../config'
import { riskColor } from '../utils/colors'

// Single AI section card with loading skeleton
function DossierSection({ title, text, generating, index, progress }) {
  const isLoading = generating && progress <= index
  const isDone    = text != null

  return (
    <div style={{
      background  : '#ffffff',
      border      : '1px solid #e8ecf0',
      borderRadius: 8,
      overflow    : 'hidden',
      marginBottom: 12,
    }}>
      <div style={{
        padding        : '10px 16px',
        borderBottom   : '1px solid #e8ecf0',
        background     : '#f8f9fa',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#2c3e50' }}>{title}</span>
        {isLoading && (
          <span style={{ fontSize: 11, color: '#3498db', fontStyle: 'italic' }}>
            Generating...
          </span>
        )}
        {isDone && !isLoading && (
          <span style={{ fontSize: 10, color: '#27ae60' }}>✓ AI generated</span>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>
        {isLoading ? (
          <div>
            {[80, 95, 70].map((w, i) => (
              <div key={i} style={{
                height: 12, borderRadius: 4,
                background: 'linear-gradient(90deg, #f0f2f5 25%, #e8ecf0 50%, #f0f2f5 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
                width: `${w}%`,
                marginBottom: i < 2 ? 8 : 0,
              }} />
            ))}
          </div>
        ) : isDone ? (
          <p style={{ fontSize: 13, lineHeight: 1.75, color: '#2c3e50', margin: 0 }}>
            {text}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
            Waiting to generate...
          </p>
        )}
      </div>
    </div>
  )
}

// Scheme badge
function SchemeBadge({ scheme }) {
  return (
    <span title={SCHEME_NAMES[scheme]} style={{
      display    : 'inline-block',
      background : '#eaf4fb',
      color      : '#2980b9',
      fontSize   : 11,
      fontWeight : 600,
      padding    : '3px 8px',
      borderRadius: 10,
      marginRight: 6,
      marginBottom: 4,
      cursor     : 'help',
    }}>
      {scheme}
    </span>
  )
}

export default function PolicyPage({ geojson, byDistrict, policySummary }) {
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const districtData = selectedDistrict ? byDistrict[selectedDistrict] : null

  const {
    sections, generating, progress, cooldown,
    sessionFull, sessionCount, SESSION_CAP,
    generate, findComparables,
  } = usePolicyDossier(policySummary, byDistrict)

  // Auto-generate when district is selected
  useEffect(() => {
    if (selectedDistrict && !sessionFull) {
      generate(selectedDistrict)
    }
  }, [selectedDistrict])

  const comparables = selectedDistrict ? findComparables(selectedDistrict) : []
  const schemes     = selectedDistrict ? getSchemesForDistrict(selectedDistrict) : []
  const cropPolicy  = districtData ? getCropPolicy(districtData.Recommended_Crop) : null

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Left panel — locked map */}
      <div style={{ width: '38%', flexShrink: 0, borderRight: '1px solid #dde3ea' }}>
        <LockedMap
          geojson={geojson}
          byDistrict={byDistrict}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </div>

      {/* Right panel — dossier */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {/* Session counter */}
        <div style={{
          display       : 'flex',
          justifyContent: 'space-between',
          alignItems    : 'center',
          marginBottom  : 16,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>
              {selectedDistrict ? `${selectedDistrict} — Policy Analysis` : 'District Policy Analysis'}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
              Click a district on the map to generate a full AI policy dossier
            </div>
          </div>
          <div style={{
            fontSize: 11, color: sessionFull ? '#c0392b' : '#999',
            background: '#f8f9fa', borderRadius: 6,
            padding: '4px 10px', flexShrink: 0,
          }}>
            {sessionFull
              ? 'Session limit reached — refresh to continue'
              : `${sessionCount}/${SESSION_CAP} analyses used this session`}
          </div>
        </div>

        {/* Reference data disclaimer */}
        <div style={{
          background  : '#fffbea',
          border      : '1px solid #f0d060',
          borderRadius: 6,
          padding     : '8px 14px',
          fontSize    : 11,
          color       : '#7d6608',
          marginBottom: 16,
        }}>
          Government scheme data (TNAU, PMKSY) is reference information compiled from training
          knowledge as of early 2026. Verify against current government circulars before
          use in official policy documents.
        </div>

        {!selectedDistrict ? (
          <div style={{
            display       : 'flex',
            flexDirection : 'column',
            alignItems    : 'center',
            justifyContent: 'center',
            height        : '60%',
            color         : '#bdc3c7',
            gap           : 12,
          }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
              stroke="#dde3ea" strokeWidth="1.5">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
              Select a district from the map to generate a comprehensive policy analysis
              including recommendation rationale, feasibility assessment, contingency
              planning, and comparable district benchmarking.
            </p>
          </div>
        ) : (
          <>
            {/* Section 1 — Static snapshot (instant, from CSV) */}
            <div style={{
              background  : 'white',
              border      : '1px solid #e8ecf0',
              borderRadius: 8,
              padding     : '14px 16px',
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#999',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: 12,
              }}>
                District Snapshot
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                marginBottom: 14,
              }}>
                {[
                  { label: 'Tier', value: `Tier ${districtData?.Tier}`, color: TIER_COLORS[districtData?.Tier] },
                  { label: 'Depth (1yr)', value: `${districtData?.CASA_Pred_1yr?.toFixed(2)}m` },
                  { label: 'GW Dependency', value: `${Math.round((districtData?.GW_Dep_Ratio||0)*100)}%` },
                  { label: 'Feasibility', value: `${districtData?.Feasibility_Score} — ${districtData?.Feasibility_Label}` },
                  { label: 'Trend', value: `${districtData?.GW_Trend_m_per_yr > 0 ? '+' : ''}${districtData?.GW_Trend_m_per_yr?.toFixed(2)}m/yr` },
                  { label: 'Flood Risk', value: districtData?.Flood_Risk, color: riskColor(districtData?.Flood_Risk) },
                  { label: 'Drought Risk', value: districtData?.Drought_Risk, color: riskColor(districtData?.Drought_Risk) },
                  { label: 'Rec Type', value: districtData?.Recommendation_Type,
                    color: districtData?.Recommendation_Type === 'Switch' ? '#c0392b'
                         : districtData?.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: '#f8f9fa', borderRadius: 6, padding: '8px 10px'
                  }}>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase',
                      letterSpacing: '0.4px', marginBottom: 3 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: color || '#2c3e50' }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendation text */}
              {districtData?.Recommendation_Text && (
                <div style={{
                  background: '#f0f9ff', borderRadius: 6, padding: '10px 12px',
                  fontSize: 12, lineHeight: 1.65, color: '#2c3e50',
                  borderLeft: `3px solid ${
                    districtData.Recommendation_Type === 'Switch'   ? '#c0392b' :
                    districtData.Recommendation_Type === 'Advisory' ? '#e67e22' : '#27ae60'
                  }`,
                  marginBottom: 12,
                }}>
                  {districtData.Recommendation_Text}
                </div>
              )}

              {/* Government scheme badges */}
              {schemes.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase',
                    letterSpacing: '0.4px', marginBottom: 6 }}>
                    Eligible Schemes
                  </div>
                  {schemes.map(s => <SchemeBadge key={s} scheme={s} />)}
                </div>
              )}
            </div>

            {/* Current crop mix */}
            <div style={{
              background: 'white', border: '1px solid #e8ecf0',
              borderRadius: 8, padding: '14px 16px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#999',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Current Crop Area Mix
              </div>
              <CropMixChart districtData={districtData} />
              {cropPolicy && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', background: '#f8f9fa',
                  borderRadius: 6, fontSize: 11, color: '#555', lineHeight: 1.6,
                }}>
                  <strong>TNAU on {districtData?.Recommended_Crop}:</strong> {cropPolicy.tnau_recommendation}
                </div>
              )}
            </div>

            {/* AI sections — generate sequentially */}
            <div style={{
              fontSize: 11, color: '#999',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              marginBottom: 10, marginTop: 4,
            }}>
              AI Policy Analysis
              {generating && (
                <span style={{ marginLeft: 8, color: '#3498db', fontStyle: 'italic',
                  textTransform: 'none', letterSpacing: 0 }}>
                  {progress}/4 sections complete
                </span>
              )}
            </div>

            <style>{`
              @keyframes shimmer {
                0%   { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>

            <DossierSection
              title="Why This Recommendation"
              text={sections.recommendation}
              generating={generating}
              index={0}
              progress={progress}
            />
            <DossierSection
              title="Feasibility Assessment"
              text={sections.feasibility}
              generating={generating}
              index={1}
              progress={progress}
            />
            <DossierSection
              title="Contingency Risk Across the Year"
              text={sections.contingency}
              generating={generating}
              index={2}
              progress={progress}
            />
            <DossierSection
              title="Comparable District Benchmarking (AI)"
              text={sections.comparable}
              generating={generating}
              index={3}
              progress={progress}
            />

            {/* Comparable districts — CSV computed */}
            <div style={{
              background: 'white', border: '1px solid #e8ecf0',
              borderRadius: 8, padding: '14px 16px', marginBottom: 12,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#999',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Similar Districts — Data Comparison</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none',
                  letterSpacing: 0, fontStyle: 'italic' }}>
                  From CSV — no AI
                </span>
              </div>
              <ComparableDistricts
                comparables={comparables}
                onSelect={setSelectedDistrict}
              />
            </div>

            {/* Cooldown / session messages */}
            {cooldown && (
              <div style={{
                padding: '10px 14px', background: '#fef9e7',
                border: '1px solid #f0d060', borderRadius: 6,
                fontSize: 12, color: '#7d6608', marginBottom: 12,
              }}>
                60 second cooldown active for {selectedDistrict}.
                Cached result shown above. Cooldown prevents API rate limit issues.
              </div>
            )}
            {sessionFull && (
              <div style={{
                padding: '10px 14px', background: '#fdecea',
                border: '1px solid #f5b7b1', borderRadius: 6,
                fontSize: 12, color: '#922b21', marginBottom: 12,
              }}>
                Session limit of {SESSION_CAP} analyses reached.
                Refresh the page to start a new session.
                Previously generated analyses remain cached and accessible.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}