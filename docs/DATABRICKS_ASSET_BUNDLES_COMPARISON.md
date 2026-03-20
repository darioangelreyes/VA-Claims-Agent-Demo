# Databricks Asset Bundles vs Current Project Architecture

## What Are Databricks Asset Bundles (DABs)?

**Databricks Asset Bundles** are a declarative, infrastructure-as-code approach to managing Databricks resources. They let you define **all** your Databricks infrastructure (jobs, notebooks, pipelines, clusters, etc.) in YAML configuration files.

### Key Concepts:
- **Declarative YAML configuration** - Define what you want, not how to build it
- **Multi-environment support** - dev, staging, prod configurations
- **Version control native** - Everything is code in Git
- **CLI-driven deployment** - `databricks bundle deploy`
- **Workspace resource management** - Jobs, pipelines, notebooks, clusters, etc.

### Example DAB Structure:
```
my-bundle/
├── databricks.yml          # Main bundle configuration
├── resources/
│   ├── jobs.yml           # Job definitions
│   ├── pipelines.yml      # SDP (bundle resources)
│   └── notebooks/         # Notebooks as code
├── src/                   # Python libraries
└── tests/                 # Unit tests
```

---

## Current Project: VA Claims Dashboard

Your current project is a **Databricks App** (not a Bundle) - a different deployment model entirely!

### What You're Building:

```
va-claims-dashboard/
├── app.yaml              # Databricks App config (NOT a bundle)
├── server/               # FastAPI backend
│   ├── app.py
│   └── routers/
├── client/               # React frontend
│   └── src/
├── dba_client.py         # Databricks SDK for runtime API calls
└── create_test_cluster.py # Programmatic resource creation
```

### Key Characteristics:
- **Web Application** - Full-stack app with UI (React + FastAPI)
- **Databricks SDK** - Programmatic API calls at runtime
- **Hosted on Databricks** - Runs as a Databricks App
- **Interactive dashboard** - End-user facing application
- **Runtime resource access** - Query data, call APIs while running

---

## Side-by-Side Comparison

| Aspect | Databricks Asset Bundles (DAB) | Your VA Claims Dashboard |
|--------|-------------------------------|--------------------------|
| **Purpose** | Infrastructure definition & deployment | End-user web application |
| **Deployment Type** | `databricks bundle deploy` | `databricks apps deploy` |
| **Primary Use Case** | Data pipelines, ETL jobs, automation | Interactive dashboards, UIs |
| **Configuration** | `databricks.yml` (comprehensive) | `app.yaml` (minimal - just command) |
| **Resources Managed** | Jobs, Clusters, Notebooks, Pipelines | Application code only |
| **Runtime Behavior** | Schedules & runs jobs | Serves HTTP requests |
| **User Interaction** | Indirect (via scheduled jobs) | Direct (web browser UI) |
| **Environment Strategy** | Multi-env in YAML (dev/staging/prod) | Manual environment variables |
| **Version Control** | Infrastructure as Code | Application code |
| **SDK Usage** | Typically not used at runtime | Used heavily for data access |

---

## Detailed Comparison

### 1. **Deployment Model**

#### Databricks Asset Bundles:
```yaml
# databricks.yml
bundle:
  name: my-data-pipeline
  
resources:
  jobs:
    etl_pipeline:
      name: Daily ETL Pipeline
      schedule:
        quartz_cron_expression: "0 0 * * *"
      tasks:
        - task_key: ingest
          notebook_task:
            notebook_path: /notebooks/ingest
          job_cluster_key: small_cluster
      
  pipelines:
    streaming_pipeline:
      name: Real-time Data Pipeline
      libraries:
        - notebook: /pipelines/transform
```

When you run `databricks bundle deploy`, it:
1. Creates/updates jobs in your workspace
2. Deploys notebooks
3. Configures clusters
4. Sets up pipelines
5. Manages permissions

**Result**: Infrastructure exists in workspace, runs on schedule

#### Your Current Project:
```yaml
# app.yaml
command: [
  "uvicorn",
  "server.app:app"
]
```

```python
# server/app.py
from fastapi import FastAPI
from databricks.sdk import WorkspaceClient

app = FastAPI()
client = WorkspaceClient()  # Runtime SDK access

@app.get("/api/claims/dashboard")
async def get_dashboard():
    # Query Databricks at runtime
    result = client.dbsql.execute_statement(...)
    return result
```

When you run `databricks apps deploy`, it:
1. Uploads your application code
2. Starts a web server (uvicorn)
3. Exposes an HTTPS endpoint
4. Runs continuously (like a web service)

**Result**: Web app running 24/7, accessible via browser

---

### 2. **What Gets Deployed**

#### DABs Deploy:
- ✅ Job definitions
- ✅ Notebook files
- ✅ SDP
- ✅ Cluster configurations
- ✅ Permissions & access control
- ✅ Model endpoints (MLflow)
- ✅ Dashboard definitions

**These run on schedules or triggers**

#### Your App Deploys:
- ✅ Python backend code (FastAPI)
- ✅ React frontend (JavaScript/TypeScript)
- ✅ Static assets (CSS, images)
- ✅ Server process configuration

**This runs continuously as a web service**

---

### 3. **Resource Management Philosophy**

#### DABs: "Declare and Deploy"
```yaml
# Define infrastructure
resources:
  jobs:
    my_job:
      clusters:
        - new_cluster:
            spark_version: "13.3.x-scala2.12"
            node_type_id: "i3.xlarge"
            num_workers: 2
```

Infrastructure is **pre-defined** in YAML. Databricks creates it during deployment.

#### Your App: "Runtime SDK Calls"
```python
# create_test_cluster.py
client = WorkspaceClient()

# Create infrastructure programmatically at runtime
cluster = client.clusters.create(
    cluster_name="test-cluster",
    spark_version="16.4.x-scala2.12",
    node_type_id="m5d.large",
    num_workers=0,
    autotermination_minutes=15
)
```

Resources are created **on-demand** via SDK calls while app is running.

---

### 4. **Use Case Scenarios**

#### When to Use DABs:

✅ **ETL Pipelines**: Daily data ingestion jobs  
✅ **ML Training Jobs**: Scheduled model training  
✅ **Data Quality Checks**: Automated validation  
✅ **SDP** (Spark Declarative Pipeline): declarative streaming tables on Spark  
✅ **CI/CD Automation**: Deploy infrastructure with code  
✅ **Multi-environment**: Promote dev → staging → prod  

**Example**: "Run a nightly job that processes claims data and updates gold tables"

#### When to Use Databricks Apps (Your Current Approach):

✅ **Interactive Dashboards**: Real-time data visualization  
✅ **Web Applications**: User-facing portals  
✅ **Admin Tools**: Cluster management interfaces  
✅ **APIs**: REST endpoints for external systems  
✅ **Custom UIs**: React/Vue/Angular applications  
✅ **Real-time Queries**: On-demand data access  

**Example**: "Build a dashboard where VA staff can view and analyze claims in real-time"

---

### 5. **Environment Management**

#### DABs: Built-in Multi-Environment
```yaml
# databricks.yml
targets:
  dev:
    workspace:
      host: https://dev-workspace.databricks.com
    resources:
      jobs:
        my_job:
          name: "my-job-dev"
          
  prod:
    workspace:
      host: https://prod-workspace.databricks.com
    resources:
      jobs:
        my_job:
          name: "my-job-prod"
          schedule:
            cron: "0 0 * * *"
```

Deploy with: `databricks bundle deploy -t prod`

#### Your App: Manual Environment Variables
```bash
# .env.dev
DATABRICKS_HOST=https://dev.databricks.com
DATABRICKS_TOKEN=dapi...

# .env.prod
DATABRICKS_HOST=https://prod.databricks.com
DATABRICKS_TOKEN=dapi...
```

Deploy with: `databricks apps deploy` (reads from env vars)

---

## Can You Use Both Together? YES! 

This is actually a **best practice** for complex projects:

### Hybrid Architecture Example:

```
va-claims-project/
├── bundles/                    # DAB for infrastructure
│   ├── databricks.yml
│   └── resources/
│       ├── jobs.yml           # ETL jobs that populate tables
│       └── pipelines.yml      # Streaming data pipelines
│
├── dashboard-app/             # Databricks App (your current project)
│   ├── app.yaml
│   ├── server/                # FastAPI reads from tables
│   └── client/                # React displays data
```

**Workflow**:
1. **DAB deploys** the ETL pipeline that processes claims data → writes to `ahunt_demo.generatorclaims` tables
2. **App queries** those tables and displays them in the dashboard UI

**Benefits**:
- ✅ ETL/pipelines managed as infrastructure (DAB)
- ✅ Dashboard managed as application code (App)
- ✅ Clear separation of concerns
- ✅ Both in version control
- ✅ Independent deployment cycles

---

## Your Current Project Analysis

### What You Have:
1. ✅ **Databricks App** - Web application with FastAPI + React
2. ✅ **Runtime SDK usage** - `dba_client.py`, `create_test_cluster.py`
3. ✅ **Manual resource creation** - Programmatic cluster creation
4. ✅ **Environment variables** - `.env.local` for configuration
5. ✅ **Application deployment** - `databricks apps deploy`

### What You're Missing (That DABs Would Provide):
1. ❌ **Declarative infrastructure** - Jobs/pipelines as code
2. ❌ **Multi-environment configs** - Easy dev/staging/prod
3. ❌ **Automated pipeline deployment** - ETL jobs alongside app
4. ❌ **Infrastructure versioning** - Track infrastructure changes in Git
5. ❌ **Dependency management** - Automated cluster/notebook deployment

---

## Should You Add DABs to This Project?

### Consider Adding DABs If:

✅ You want to automate **data pipeline deployment** (ETL jobs)  
✅ You need **multi-environment** infrastructure (dev/staging/prod)  
✅ You're managing **multiple jobs** that feed the dashboard  
✅ You want **CI/CD** for data workflows  
✅ You need to **version control** Databricks infrastructure  

### Example: Adding a DAB for Data Pipelines

```
va-claims-dashboard/
├── app.yaml                   # Existing app
├── server/                    # Existing backend
├── client/                    # Existing frontend
│
└── bundle/                    # NEW: Add bundle for pipelines
    ├── databricks.yml
    └── resources/
        ├── claims_etl_job.yml         # Nightly claims processing
        ├── pact_act_pipeline.yml      # PACT Act data pipeline
        └── notebooks/
            ├── ingest_claims.py
            └── transform_claims.py
```

Then deploy both:
```bash
# Deploy infrastructure (jobs, pipelines)
cd bundle && databricks bundle deploy

# Deploy web application
databricks apps deploy
```

---

## Quick Decision Matrix

| Question | Use DAB | Use Databricks App | Use SDK |
|----------|---------|-------------------|---------|
| Need scheduled ETL jobs? | ✅ | ❌ | ❌ |
| Need web UI for users? | ❌ | ✅ | ❌ |
| Need SDP? | ✅ | ❌ | ❌ |
| Need interactive dashboard? | ❌ | ✅ | ❌ |
| Need multi-env infrastructure? | ✅ | ⚠️ Manual | ⚠️ Manual |
| Need programmatic automation? | ❌ | ⚠️ Limited | ✅ |
| Need to create resources on-demand? | ❌ | ✅ | ✅ |
| Need REST API endpoints? | ❌ | ✅ | ❌ |

---

## Summary

### Databricks Asset Bundles:
- **Infrastructure-as-Code** for Databricks resources
- Deploy jobs, pipelines, notebooks, clusters declaratively
- Best for: ETL, ML pipelines, automation, CI/CD
- Configuration-driven (YAML)

### Your VA Claims Dashboard:
- **Web Application** hosted on Databricks
- FastAPI backend + React frontend
- Best for: Interactive UIs, real-time dashboards, APIs
- Code-driven (Python + TypeScript)

### Key Insight:
You're building a **web app**, not infrastructure. DABs would be useful if you also need to manage **data pipelines** that feed your dashboard. They're complementary, not competing approaches!

### Recommendation:
**Keep your current approach** for the dashboard app itself. Consider **adding a DAB** if you need to:
1. Automate data ingestion/transformation jobs
2. Deploy scheduled workflows
3. Manage multiple environments (dev/staging/prod)
4. Version control Databricks infrastructure

---

## Resources

- [Databricks Asset Bundles Docs](https://docs.databricks.com/dev-tools/bundles/)
- [Databricks Apps Docs](https://docs.databricks.com/dev-tools/databricks-apps/)
- [When to Use What Guide](https://docs.databricks.com/dev-tools/index.html)


