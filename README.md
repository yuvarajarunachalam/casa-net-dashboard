# CASA-Net Dashboard

React + Vite dashboard for the Tamil Nadu groundwater policy pipeline.

---

## Local setup (5 minutes)

### Step 1 — Copy your data files

```bash
mkdir -p dashboard/public/data
```

Copy every file from your `casa_net/outputs/` folder into `dashboard/public/data/`.
The minimum required files are:

```
policy_summary.csv
district_tiers.csv
feasibility_scores.csv
flood_contingency.csv
drought_contingency.csv
shap_values.csv
model_comparison_metrics.csv
merged_annual.csv
casa_net_predictions.csv
enriched_districts.geojson
shap_summary_beeswarm.png
gate_weights_chart.png
shap_vs_attribution_validation.png
shap_waterfall_Coimbatore.png
shap_waterfall_Namakkal.png
shap_waterfall_Tiruppur.png
shap_waterfall_Theni.png
shap_waterfall_Krishnagiri.png
```

### Step 2 — Install dependencies

```bash
cd dashboard
npm install
```

### Step 3 — Run locally

```bash
npm run dev
```

Open http://localhost:5173

The dashboard works fully without a Gemini API key — it falls back to precomputed
narratives from Script 8 for all district briefs.

---

## Adding AI narratives locally (optional)

The Vercel serverless function (`api/narrative.js`) only runs on Vercel.
For local AI narratives, create a `.env.local` file:

```
VITE_GEMINI_API_KEY=your_key_here
```

Then update `src/hooks/useNarrative.js` to call the Gemini API directly
from the browser using `import.meta.env.VITE_GEMINI_API_KEY` instead of `/api/narrative`.
For the review demo, precomputed narratives are sufficient.

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "CASA-Net dashboard"
git remote add origin https://github.com/<your-username>/casa-net-dashboard.git
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to https://vercel.com → New Project → Import your GitHub repo
2. Framework preset: Vite
3. Root directory: `dashboard/`
4. Build command: `npm run build`
5. Output directory: `dist`

### Step 3 — Add Gemini API key (optional)

In Vercel project settings → Environment Variables:
```
GEMINI_API_KEY = your_gemini_api_key
```

Get a free key at https://aistudio.google.com/app/apikey

### Step 4 — Deploy

Vercel auto-deploys on every `git push`. Your public URL appears in the dashboard.

---

## File structure

```
dashboard/
  api/
    narrative.js          Vercel serverless function — Gemini API call
  public/
    data/                 Paste your outputs/ files here
  src/
    App.jsx               Root component, tab and district state
    main.jsx              React entry point
    index.css             All styles
    config.js             Data paths and constants
    utils/
      dataLoader.js       All CSV/GeoJSON fetch and parse
      colors.js           Color scale functions
    hooks/
      useNarrative.js     AI narrative fetch hook with caching
    components/
      Header.jsx          Navigation bar
      MapView.jsx         Leaflet choropleth map
      DistrictPanel.jsx   Right sidebar — metrics, chart, SHAP, AI brief
      AIInsightsPanel.jsx Top 5 priority districts with auto narratives
      GWChart.jsx         Recharts forecast line chart
      PriorityTable.jsx   Expandable tier tables
      ScenarioPlanner.jsx Flood/drought contingency cards
      ModelView.jsx       SHAP images and model metrics
  index.html
  package.json
  vite.config.js
  vercel.json
```
