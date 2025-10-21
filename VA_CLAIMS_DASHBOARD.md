# VA Claims Command Center Dashboard

A mission and action-oriented dashboard for VA claims management, inspired by the FDA Traceability Command Center design.

## Overview

This dashboard provides real-time monitoring and management of Veteran Affairs claims processing, featuring:

- **Key Performance Metrics**: Real-time tracking of claim cycle times, active claims, processing rates, and veteran impact
- **Critical Claims Alerts**: Highlighting urgent claims with extended processing times
- **Claims Visibility Tracking**: Regional and provider-level visibility into claims processing delays
- **Data Integrity Monitoring**: Compliance and data quality metrics
- **Action-Oriented Interface**: Quick access to deployment resources, regional coordination, and system intelligence

## Architecture

### Frontend (React + TypeScript + Tailwind)
- **Port**: 5174
- **Framework**: React 18 with Vite
- **UI Components**: shadcn/ui components (Card, Button, Badge, Alert, Progress)
- **Styling**: Tailwind CSS with custom gradients and animations
- **Features**:
  - Auto-refreshing dashboard (30-second intervals)
  - Real-time clock display
  - Loading states and error handling
  - Responsive grid layouts

### Backend (FastAPI + Python)
- **Port**: 8001
- **Framework**: FastAPI with async support
- **Data Source**: Databricks SQL (via Workspace Client SDK)
- **Endpoints**:
  - `GET /api/claims/dashboard` - Complete dashboard data
  - `GET /api/claims/metrics` - Key performance indicators
  - `GET /api/claims/critical` - Critical claims list
  - `GET /health` - Health check

### Data Layer
- **Source**: Databricks `ahunt_demo.generatorclaims` schema
- **Tables Used**:
  - `gold_claims_throughput_daily` - Metrics and throughput
  - `silver_claims_events` - Claims processing events
  - `gold_provider_experience_daily` - Provider and regional analytics
- **Fallback**: Mock data available if Databricks connection fails

## Configuration

### Port Configuration
This app runs on alternate ports to avoid conflicts:
- **Frontend**: `http://localhost:5174` (configured in `client/vite.config.ts`)
- **Backend**: `http://localhost:8001` (start scripts)
- **API Proxy**: Frontend proxies `/api` requests to backend

### Environment Variables
The `.env` file contains:
```bash
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com/?o=YOUR_ORG_ID
DATABRICKS_TOKEN=dapi_your_token_here
DATABRICKS_APP_NAME=alex-app
DATABRICKS_USER=alex.hunt@databricks.com
DBA_SOURCE_CODE_PATH=/Workspace/Users/alex.hunt@databricks.com/SupplyChainFDA
```

## Running the Application

### Option 1: Separate Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
./start_backend.sh
```

**Terminal 2 - Frontend:**
```bash
./start_frontend.sh
```

### Option 2: Combined Script
```bash
./run_claims_app.sh
```

### Verify It's Running
- Backend health: `curl http://localhost:8001/health`
- Frontend: Open `http://localhost:5174` in your browser
- API dashboard data: `curl http://localhost:8001/api/claims/dashboard`

## Dashboard Features

### 1. Header Section
- VA branding and title
- Real-time clock display
- Last updated timestamp

### 2. Critical Alert Banner
- Red alert styling for urgent attention
- Displays current claim processing delays
- Shows number of affected veterans

### 3. Key Metrics Cards (4 Metrics)
- **Claim Cycle Time**: Average hours with trend indicator
- **Active Claims**: Total requiring action
- **Processing Rate**: Percentage meeting SLA targets
- **Veteran Impact**: Total veterans affected

### 4. Critical Claims Backlog
- List of claim types with extended delays
- Number of veterans affected per category
- Days delayed badge
- Hover states for interactivity

### 5. Claims Processing Visibility
- **Data Integrity Progress**: Visual progress bars
- **Compliance Metrics**: FHMA 204 compliance tracking
- **Visibility Gaps Table**: Provider, claim type, region, and delay hours
- **Regional Delay Charts**: Stacked bar charts showing normal vs delayed by region

### 6. Priority Actions (3 Action Cards)
- **Enforcement Readiness**: Deploy resources for compliance
- **Regional Coordination**: Initiate outreach programs
- **System Intelligence**: Enable predictive analytics

## File Structure

```
├── server/
│   ├── app.py                          # Main FastAPI application
│   ├── routers/
│   │   └── claims.py                   # Claims API endpoints
│   └── services/
│       └── claims_service.py           # Databricks query service
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── ClaimsDashboard.tsx     # Main dashboard component
│   │   ├── services/
│   │   │   └── claimsService.ts        # Frontend API client
│   │   ├── components/ui/
│   │   │   ├── card.tsx                # Card component
│   │   │   ├── button.tsx              # Button component
│   │   │   ├── badge.tsx               # Badge component
│   │   │   ├── alert.tsx               # Alert component
│   │   │   └── progress.tsx            # Progress bar component
│   │   └── App.tsx                     # Root component
│   └── vite.config.ts                  # Vite configuration (port 5174)
├── .env                                # Databricks connection config
├── start_backend.sh                    # Backend startup script
├── start_frontend.sh                   # Frontend startup script
└── run_claims_app.sh                   # Combined startup script
```

## Design Philosophy

The dashboard follows the FDA Command Center design principles:

1. **Mission-Critical Focus**: Immediate visibility of critical issues
2. **Action-Oriented**: Clear calls-to-action for addressing problems
3. **Data Hierarchy**: Most important metrics at the top
4. **Professional Aesthetics**: Government-appropriate blue color scheme
5. **Real-Time Updates**: Auto-refresh every 30 seconds
6. **Accessibility**: Clear typography, good contrast ratios
7. **Responsive Layout**: Works on different screen sizes

## Color Scheme

- **Primary Blue**: `#1e3a8a` (blue-900) for headers
- **Accent Blue**: `#2563eb` (blue-600) for positive indicators
- **Warning Red**: `#dc2626` (red-600) for alerts and delays
- **Success Green**: `#16a34a` (green-600) for compliance
- **Neutral Grays**: `#f9fafb` to `#1f2937` for backgrounds and text

## API Reference

### GET /api/claims/dashboard
Returns complete dashboard data including metrics, critical claims, visibility gaps, and regional delays.

**Response:**
```json
{
  "metrics": {
    "avgCycleTime": 28.5,
    "activeClaims": 534,
    "processingRate": 67.0,
    "veteranImpact": 186187
  },
  "criticalClaims": [...],
  "visibilityGaps": [...],
  "regionDelays": [...],
  "dataIntegrity": 94.6,
  "compliance": 92.1
}
```

### GET /api/claims/metrics
Returns just the key performance indicators.

### GET /api/claims/critical
Returns the list of critical claims with delays.

## Development Notes

- Frontend uses `bun` for package management and faster builds
- Backend uses `uv` for Python dependency management
- CORS configured to allow both localhost:5174 and localhost:3000
- Mock data available as fallback for development without Databricks access
- Hot reload enabled for both frontend and backend during development

## Future Enhancements

- [ ] Add filtering and sorting capabilities
- [ ] Export data to CSV/PDF reports
- [ ] Historical trend visualizations
- [ ] User authentication and role-based access
- [ ] Drill-down into specific claims
- [ ] Email/SMS alerts for critical thresholds
- [ ] Integration with additional data sources
- [ ] Mobile-responsive optimizations

## Support

For issues or questions:
1. Check that both services are running on correct ports
2. Verify Databricks connection in `.env` file
3. Check browser console for frontend errors
4. Check terminal output for backend errors
5. Verify SQL warehouse is running in Databricks

