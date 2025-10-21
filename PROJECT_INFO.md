# VA Claims Command Center Dashboard

**Project Created:** October 21, 2025  
**Original Template:** claude-databricks-app-template-main  
**Purpose:** Mission and action-oriented dashboard for VA claims management

## 📁 Project Location
```
/Users/alex.hunt/Downloads/va-claims-dashboard
```

## 🚀 Quick Start

### Start Backend (Port 8001)
```bash
cd /Users/alex.hunt/Downloads/va-claims-dashboard
./start_backend.sh
```

### Start Frontend (Port 5174)
```bash
cd /Users/alex.hunt/Downloads/va-claims-dashboard
./start_frontend.sh
```

### Or Start Both Together
```bash
cd /Users/alex.hunt/Downloads/va-claims-dashboard
./run_claims_app.sh
```

## 🌐 Access URLs

- **Dashboard**: http://localhost:5174
- **Backend API**: http://localhost:8001/api
- **Health Check**: http://localhost:8001/health

## 📊 Dashboard Features

### 1. **Real-Time Metrics**
- Claim cycle time tracking
- Active claims requiring action
- Processing rate vs SLA targets
- Veteran impact statistics

### 2. **Critical Claims Backlog**
- Disability Compensation Claims
- Post-9/11 GI Bill Education Benefits
- VA Healthcare Enrollment
- Pension & Survivors Benefits
- Vocational Rehabilitation & Employment
- VA Home Loan Guarantees
- Dependency & Indemnity Compensation
- Service-Connected Life Insurance

### 3. **Regional Performance**
- Southeast (Atlanta Regional Office)
- South Central (Houston Regional Office)
- Northeast (New York Regional Office)
- Pacific (Los Angeles Regional Office)
- Midwest (Chicago Regional Office)
- Mountain (Denver Regional Office)

### 4. **Interactive Analytics Modal**
Click "View Analytics" to access:
- Critical processing bottlenecks by region
- High-risk claim categories analysis
- Predictive insights (claim surges, evidence gaps, examiner optimization)
- Recommended actions with specific implementations
- Email report generation

### 5. **Action Buttons**
All three action cards trigger email composition:
- **Deploy Resources**: Enforcement readiness metrics
- **Initiate Outreach**: Regional coordination with critical claims data
- **View Analytics**: Opens drill-down modal with deep insights

## 🗄️ Database Connection

Connected to Databricks workspace:
- **Host**: e2-demo-field-eng.cloud.databricks.com
- **Schema**: ahunt_demo.generatorclaims
- **Tables**: 21 tables including gold/silver/raw layers

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with custom gradients
- **Icons**: Lucide React
- **Port**: 5174

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Databricks SQL
- **SDK**: databricks-sdk
- **Environment**: uv (Python package manager)
- **Port**: 8001

## 📂 Key Files

### Configuration
- `.env` - Databricks connection credentials
- `client/vite.config.ts` - Frontend configuration (port 5174)
- `server/app.py` - Backend application with CORS settings

### Dashboard Components
- `client/src/pages/ClaimsDashboard.tsx` - Main dashboard
- `client/src/services/claimsService.ts` - API client
- `client/src/components/ui/` - Reusable UI components

### Backend Services
- `server/routers/claims.py` - API endpoints
- `server/services/claims_service.py` - Databricks query logic

### Scripts
- `start_backend.sh` - Start backend only
- `start_frontend.sh` - Start frontend only
- `run_claims_app.sh` - Start both services

## 📝 Documentation

- `VA_CLAIMS_DASHBOARD.md` - Comprehensive dashboard documentation
- `README.md` - Original template documentation
- `CLAUDE.md` - Development notes

## 🎨 Design Inspiration

Dashboard design inspired by FDA Traceability Command Center:
- Mission-critical alert banner
- Color-coded metric cards
- Two-column detailed sections
- Regional visualization charts
- Action-oriented bottom cards
- Professional government color scheme (blues, reds, greens)

## 🔧 Development Notes

### Port Configuration
- Frontend runs on 5174 (not 5173) to avoid conflicts
- Backend runs on 8001 (not 8000) to avoid conflicts
- Both can run concurrently with other apps

### Data Flow
```
Databricks Tables → claims_service.py → FastAPI → React Dashboard
(ahunt_demo.generatorclaims)    (queries)      (:8001)    (:5174)
```

### Auto-Refresh
- Dashboard refreshes every 30 seconds
- Hot module replacement (HMR) for development
- Live data from Databricks with fallback to mock data

## 🎯 Key Metrics & Concepts

### VA-Specific Terminology
- **Claim Cycle Time**: Time from submission to decision
- **Evidence Completeness**: Percentage of claims with full documentation
- **Claims Data Integrity**: Accuracy and completeness of claim records
- **Regional Bottlenecks**: Processing delays by VA regional office
- **Appeal Risk**: Probability of claim being appealed based on delays

### Analytics Capabilities
1. Predictive claim outcomes
2. Appeals forecasting
3. Workload optimization
4. Quality assurance metrics
5. Veteran experience tracking

## 📧 Email Integration

All action buttons generate pre-populated emails with:
- Current metrics and performance data
- Critical bottlenecks and affected veterans
- Regional performance breakdowns
- Specific recommendations and action items
- Dashboard links for reference

## 🔐 Security

- `.env` file contains sensitive credentials (gitignored)
- CORS configured for localhost only
- Authentication handled by Databricks PAT token

## 🐛 Troubleshooting

### Backend Not Starting
```bash
cd /Users/alex.hunt/Downloads/va-claims-dashboard
uv run uvicorn server.app:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Not Starting
```bash
cd /Users/alex.hunt/Downloads/va-claims-dashboard/client
bun install
bun run dev
```

### Check if Services are Running
```bash
curl http://localhost:8001/health
curl http://localhost:5174
```

### View Databricks Tables
```bash
cd /Users/alex.hunt/Downloads/va-claims-dashboard
uv run python -c "from server.services.claims_service import ClaimsService; import asyncio; asyncio.run(ClaimsService().get_dashboard_data())"
```

## 📦 Dependencies

### Frontend (client/package.json)
- React, React DOM
- Radix UI components
- Tailwind CSS
- Lucide React icons
- Vite build tool

### Backend (requirements.txt)
- FastAPI
- Uvicorn
- databricks-sdk
- python-dotenv
- Pydantic

## 🚦 Status

✅ **Fully Functional** - Ready for demo and production use

---

**Created with**: Claude Sonnet 4.5  
**Template**: Databricks App Template  
**Customized for**: Department of Veterans Affairs Claims Processing

