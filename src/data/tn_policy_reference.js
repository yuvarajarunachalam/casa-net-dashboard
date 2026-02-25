// tn_policy_reference.js
// Static reference data for Tamil Nadu agricultural policy context.
// Sources: TNAU crop production guide (2023), PMKSY scheme guidelines,
// Tamil Nadu State Agriculture Department advisories.
//
// IMPORTANT: This is reference data compiled from training knowledge
// as of early 2026. It is intended for decision-support context only
// and should be verified against current government circulars before
// use in official policy documents.

export const CROP_SCHEMES = {
  Bajra: {
    tnau_recommendation:
      "TNAU recommends Co(Cu)-9 and K-677 varieties for Tamil Nadu dryland conditions. " +
      "Suited for districts with annual rainfall 300-700mm. Duration 75-85 days.",
    pmksy_eligible: true,
    pmksy_note:
      "Eligible under PMKSY Per Drop More Crop component for micro-irrigation subsidy " +
      "(drip/sprinkler). Subsidy covers 55% of installation cost for small/marginal farmers.",
    water_saving_note:
      "Bajra requires 350-400mm seasonal water against Rice's 1200-1500mm. " +
      "Most water-efficient cereal option for Tamil Nadu dryland tracts.",
    market_note:
      "Procurement under MSP through TNCSC. Coarse grain demand rising with " +
      "ethanol blending programme and livestock feed sector.",
    challenges:
      "Low farmer familiarity in traditionally rice-growing districts. " +
      "Processing infrastructure limited outside Tirunelveli and Virudhunagar belts.",
  },
  Jowar: {
    tnau_recommendation:
      "TNAU recommends CO(S) 28 and CSH-16 for Tamil Nadu. Dual purpose — " +
      "grain and fodder. Duration 100-110 days.",
    pmksy_eligible: true,
    pmksy_note:
      "Eligible under PMKSY. Drip irrigation subsidy applicable. " +
      "Also covered under Rashtriya Krishi Vikas Yojana (RKVY) for coarse cereals promotion.",
    water_saving_note:
      "Requires 450-550mm seasonal water. 40-50% less than Rice.",
    market_note:
      "Strong local demand for fodder in dairy districts. " +
      "MSP procurement available through TNCSC.",
    challenges:
      "Bird damage in open field conditions. Requires crop protection advisory.",
  },
  Groundnut: {
    tnau_recommendation:
      "TNAU recommends VRI 8 and CO 7 varieties. Kharif and Rabi seasons both viable. " +
      "Duration 100-110 days. Best in sandy loam soils.",
    pmksy_eligible: true,
    pmksy_note:
      "Eligible under PMKSY micro-irrigation. Also covered under National Food " +
      "Security Mission (oilseeds component) for seed subsidy.",
    water_saving_note:
      "Requires 500-600mm seasonal water against Rice's 1200-1500mm. " +
      "60% water saving potential where Rice is currently dominant.",
    market_note:
      "Strong domestic and export demand. Good price realisation in Vellore, " +
      "Villupuram, and Tiruvannamalai belts. NAFED procurement for buffer stock.",
    challenges:
      "Aflatoxin risk in high-humidity post-harvest conditions. " +
      "Requires proper storage advisory.",
  },
  Maize: {
    tnau_recommendation:
      "TNAU recommends COH(M) 8 hybrid for Tamil Nadu. Suited to irrigated and " +
      "semi-irrigated conditions. Duration 90-100 days.",
    pmksy_eligible: true,
    pmksy_note:
      "Eligible under PMKSY. Also covered under RKVY for feed grain promotion.",
    water_saving_note:
      "Requires 500-600mm seasonal water. Moderate saving vs Rice.",
    market_note:
      "Strong demand from poultry feed industry centred in Namakkal and Erode districts. " +
      "Contract farming arrangements available with major integrators.",
    challenges:
      "Highly competitive market. Price volatile against imports.",
  },
  Rice: {
    tnau_recommendation:
      "TNAU recommends ADT 53, CO 51, and CR 1009 sub1 for Samba season. " +
      "ADT 36 for medium-duration situations. TRY 3 and ADT 43 for flood-prone areas.",
    pmksy_eligible: false,
    pmksy_note:
      "Rice is not prioritised under PMKSY water efficiency component " +
      "given its high water requirement. Canal-irrigated rice is supported " +
      "under Pradhan Mantri Fasal Bima Yojana (PMFBY) for crop insurance.",
    water_saving_note:
      "Highest water requirement crop. No saving — transition away from Rice " +
      "is the primary lever for groundwater conservation in GW-dependent districts.",
    market_note:
      "MSP procurement well-established through TNCSC. Cultural preference strong " +
      "especially in delta districts. Transition away faces social resistance.",
    challenges:
      "Any transition away from Rice faces significant farmer resistance " +
      "and requires sustained extension support over 3-5 cropping seasons.",
  },
}

// District-level government scheme eligibility flags
// Based on Tamil Nadu Agriculture Department drought-prone area classification
export const DISTRICT_SCHEMES = {
  Coimbatore    : ["PMKSY", "RKVY", "NMSA", "NHM"],
  Tiruppur      : ["PMKSY", "RKVY", "NMSA"],
  Namakkal      : ["PMKSY", "RKVY", "NMSA"],
  Theni         : ["PMKSY", "RKVY", "NMSA", "NHM"],
  Krishnagiri   : ["PMKSY", "RKVY", "NMSA"],
  Dharmapuri    : ["PMKSY", "RKVY", "NMSA", "NHM"],
  Dindigul      : ["PMKSY", "RKVY"],
  Virudhunagar  : ["PMKSY", "RKVY"],
  Madurai       : ["PMKSY", "RKVY"],
  Salem         : ["PMKSY", "RKVY", "NMSA"],
  Erode         : ["PMKSY", "RKVY"],
  Karur         : ["PMKSY"],
  Tiruchirapalli: ["PMKSY"],
  default       : ["PMKSY"],
}

// Scheme full names for tooltip display
export const SCHEME_NAMES = {
  PMKSY : "Pradhan Mantri Krishi Sinchayee Yojana — micro-irrigation subsidy",
  RKVY  : "Rashtriya Krishi Vikas Yojana — crop diversification funding",
  NMSA  : "National Mission for Sustainable Agriculture — dryland farming support",
  NHM   : "National Horticulture Mission — high-value crop transition support",
}

export function getSchemesForDistrict(district) {
  return DISTRICT_SCHEMES[district] || DISTRICT_SCHEMES.default
}

export function getCropPolicy(crop) {
  return CROP_SCHEMES[crop] || CROP_SCHEMES.Rice
}