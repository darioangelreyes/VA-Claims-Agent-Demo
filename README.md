# VA Claims Command Center Dashboard

A real-time, mission-oriented dashboard for VA claims management, inspired by FDA Traceability Command Center design principles. Built with React, FastAPI, and Databricks.

![VA Claims Dashboard](https://img.shields.io/badge/VA-Claims%20Dashboard-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat&logo=fastapi)
![Databricks](https://img.shields.io/badge/Databricks-Connected-FF3621?style=flat&logo=databricks)

## 📊 Features

### Real-Time Metrics Dashboard
- **Claim Cycle Time** tracking with baseline comparison
- **Active Claims** requiring immediate action
- **Processing Rate** vs SLA targets
- **Veteran Impact** statistics with 186K+ veterans tracked

### Critical Claims Management
- Disability Compensation Claims
- Post-9/11 GI Bill Education Benefits  
- VA Healthcare Enrollment
- Pension & Survivors Benefits
- Vocational Rehabilitation & Employment
- VA Home Loan Guarantees
- Dependency & Indemnity Compensation
- Service-Connected Life Insurance

### Regional Performance Monitoring
Track claims processing across VA Regional Offices:
- Southeast (Atlanta)
- South Central (Houston)
- Northeast (New York)
- Pacific (Los Angeles)
- Midwest (Chicago)
- Mountain (Denver)

### Interactive Analytics
Click **"View Analytics"** to access:
- 🎯 Critical processing bottlenecks by region
- 📈 High-risk claim categories with appeal probability
- 🔮 Predictive insights (claim surges, evidence gaps)
- ⚡ AI-powered recommendations
- 📧 One-click email report generation

### Action-Oriented Design
Three mission-critical action cards:
1. **Deploy Resources** - Enforcement readiness metrics
2. **Initiate Outreach** - Regional coordination
3. **View Analytics** - Deep drill-down modal

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+ or Bun
- Databricks workspace with SQL warehouse
- UV package manager (Python)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/va-claims-dashboard.git
cd va-claims-dashboard
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your Databricks credentials
```

3. **Install backend dependencies**
```bash
uv sync
```

4. **Install frontend dependencies**
```bash
cd client
bun install
```

### Running the Application

**Option 1: Run both services together**
```bash
./run_claims_app.sh
```

**Option 2: Run services separately**

Terminal 1 - Backend:
```bash
./start_backend.sh
```

Terminal 2 - Frontend:
```bash
./start_frontend.sh
```

### Access the Dashboard
- **Dashboard**: http://localhost:5174
- **Backend API**: http://localhost:8001/api
- **Health Check**: http://localhost:8001/health
- **API Docs**: http://localhost:8001/docs

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for blazing-fast builds
- Tailwind CSS for styling
- shadcn/ui components (Radix UI)
- Lucide React icons
- Auto-refresh every 30 seconds

**Backend**
- FastAPI (Python)
- Databricks SDK for data access
- Async/await for performance
- Pydantic for data validation
- CORS enabled for local development

**Database**
- Databricks SQL
- Schema: `ahunt_demo.generatorclaims`
- 21 tables (gold/silver/raw layers)

### Data Flow
```
Databricks Tables → claims_service.py → FastAPI → React Dashboard
(gold/silver)          (SQL queries)      (:8001)     (:5174)
```

## 📂 Project Structure

```
va-claims-dashboard/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   └── ClaimsDashboard.tsx    # Main dashboard
│   │   ├── services/
│   │   │   └── claimsService.ts       # API client
│   │   └── components/ui/             # Reusable components
│   └── vite.config.ts         # Vite config (port 5174)
├── server/                    # FastAPI backend
│   ├── routers/
│   │   └── claims.py          # API endpoints
│   └── services/
│       └── claims_service.py  # Databricks queries
├── .env                       # Databricks credentials (gitignored)
├── start_backend.sh          # Backend startup script
├── start_frontend.sh         # Frontend startup script
└── run_claims_app.sh         # Combined startup script
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
DATABRICKS_AUTH_TYPE=pat
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=dapi...
DATABRICKS_APP_NAME=va-claims-dashboard
DATABRICKS_USER=your.email@example.com
```

### Port Configuration
- Frontend: `5174` (configured in `client/vite.config.ts`)
- Backend: `8001` (configured in startup scripts)

These alternate ports allow running alongside other applications.

## 📊 Key Metrics

### VA-Specific Concepts
- **Evidence Completeness Rate**: % of claims with full documentation
- **Claims Data Integrity**: Accuracy of claim records
- **Regional Bottlenecks**: Processing delays by office
- **Appeal Risk**: Probability based on processing time

### Analytics Capabilities
1. **Predictive Claim Outcomes** - Disability rating prediction
2. **Appeals Forecasting** - Early intervention identification
3. **Workload Optimization** - Resource allocation
4. **Quality Assurance** - Anomaly detection
5. **Veteran Experience** - Wait time prediction

## 🎨 Design Philosophy

Inspired by FDA Traceability Command Center:
- ✅ Mission-critical focus with urgent alert banner
- ✅ Color-coded metrics (blue = info, red = critical, green = success)
- ✅ Two-column detailed sections
- ✅ Regional visualization charts
- ✅ Action-oriented bottom cards
- ✅ Professional government aesthetic

## 📧 Email Integration

All action buttons generate pre-populated emails with:
- Current metrics and KPIs
- Critical bottlenecks with affected veteran counts
- Regional performance data
- Specific recommendations
- Dashboard links for reference

## 🔐 Security

- Environment variables for sensitive credentials
- `.env` file gitignored
- CORS configured for localhost only
- Databricks PAT token authentication

## 🐛 Troubleshooting

### Backend won't start
```bash
cd /path/to/va-claims-dashboard
uv run uvicorn server.app:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend won't start
```bash
cd client
bun install  # or npm install
bun run dev  # or npm run dev
```

### Check services
```bash
curl http://localhost:8001/health  # Backend
curl http://localhost:5174         # Frontend
```

### View API documentation
Visit http://localhost:8001/docs for interactive API docs

## 📝 API Endpoints

### GET /api/claims/dashboard
Returns complete dashboard data
```json
{
  "metrics": { "avgCycleTime": 28.5, "activeClaims": 534, ... },
  "criticalClaims": [...],
  "visibilityGaps": [...],
  "regionDelays": [...],
  "dataIntegrity": 94.6,
  "compliance": 92.1
}
```

### GET /api/claims/metrics
Returns key performance indicators only

### GET /api/claims/critical
Returns list of critical claims with delays

### GET /health
Health check endpoint

## 🚦 Development

### Hot Reload
Both frontend and backend support hot reload during development.

### Adding New Features
1. Backend: Add routes in `server/routers/`, logic in `server/services/`
2. Frontend: Add components in `client/src/components/`, pages in `client/src/pages/`
3. Update types in both TypeScript and Pydantic models

### Code Style
- Frontend: TypeScript with React best practices
- Backend: Python with type hints
- Styling: Tailwind CSS utility classes

## 📦 Deployment

### Databricks Apps
This application can be deployed as a Databricks App:
```bash
databricks apps deploy
```

### Docker (Coming Soon)
```bash
docker-compose up
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## 🙏 Acknowledgments

- Design inspired by FDA Traceability Command Center
- Built with Databricks App Template
- UI components from shadcn/ui
- Icons from Lucide React

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for Veterans Affairs**  
**Powered by**: React • FastAPI • Databricks • Tailwind CSS
