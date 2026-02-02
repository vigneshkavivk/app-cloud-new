# Dashboard

The **CloudMaSa Dashboard** is your central hub for monitoring, managing, and automating your cloud infrastructure.



## Welcome Message

When you log in, you’ll see:
- **Welcome, [Your Name]** — Personalized greeting
- **[super-admin]** — Your role (e.g., super-admin, admin, editor)
- **Dashboard** — Highlighted in the sidebar

> 💡 Pro Tip: Use **Masa Bot** to ask, “What’s my role?” or “Who’s logged in?”



## Metrics Overview

Get a high-level view of your infrastructure at a glance.

### Active Clusters
- Shows the number of **Kubernetes clusters** currently running
- Click to view details: region, provider, status

### Databases
- Shows the number of **databases** (PostgreSQL, MySQL, MongoDB) you’re managing
- Click to view: type, size, connection status

> 📊 Example:
> - **Active Clusters**: `2`
> - **Databases**: `3`



## Tools Overview

See which tools are actively being used in your environment.

### Tools in Use
- Shows the number of **DevOps tools** (e.g., Argo CD, Jenkins, Terraform) currently deployed
- Click to view: tool name, version, last used

> 📊 Example:
> - **Tools in Use**: `1` (e.g., Argo CD v2.5)



## Connection Status

Monitor the health of your integrations.

### GitHub Status
- Shows if your **GitHub connection** is active
- Click to view: last sync, repositories, webhooks

### Connected Accounts
- Shows the number of **cloud accounts** (AWS, GCP, Azure) you’ve connected
- Click to view: account ID, region, last activity

> 📊 Example:
> - **GitHub Status**: `Connected`
> - **Connected Accounts**: `2` (AWS, GCP)



## Live Metrics

Real-time performance data for your infrastructure.

### CPU Utilization
- Shows average CPU usage across all clusters
- Trend line shows usage over time
- Green arrow indicates improvement (e.g., `+11%`)

### Network Traffic
- Shows total network throughput (e.g., `1.2 Gbps`)
- Trend line shows traffic patterns
- Green arrow indicates improvement (e.g., `+9%`)

> 📊 Example:
> - **CPU Utilization**: `Avg: 57%`
> - **Network Traffic**: `Throughput: 1.2 Gbps`



## Recent Activity

Track recent events in your environment.

### Activity Log
- Shows a list of recent actions:
  - Deployments (success/fail)
  - Credential rotations
  - Webhook triggers
  - Scaling events

> 📊 Example:
> - **Just now**: `AWS credentials rotated` → `failed`
> - **1 minute ago**: `Deployed frontend to staging` → `success`
> - **2 minutes ago**: `GitHub webhook received` → `success`

> 💡 Pro Tip: Use **Masa Bot** to ask, “Show me recent deployments” or “Why did the AWS rotation fail?”



## Cost Overview

Track your cloud spending in real-time.

### Monthly Cost
- Shows your **total monthly cost** for selected AWS account
- Click to view: service breakdown, cost trends

### Service Breakdown
- Lists each AWS service and its cost:
  - CloudShell: ₹0
  - CloudTrail: ₹0
  - Cost Explorer: ₹0
  - Data Transfer: ₹-0.02
  - Glue: ₹0
  - Key Management Service: ₹0
  - DynamoDB: ₹0

> 💰 Example:
> - **Monthly Cost**: `₹0` 
> - **Total for Account 0918**: `₹0`

> 💡 Pro Tip: Use **Masa Bot** to ask, “Which service is costing the most?” or “Show me cost trends.”



## Best Practices

>  Always check the **Recent Activity** after a deployment  
>  Monitor **Live Metrics** during peak hours  
>  Review **Cost Overview** weekly to avoid surprises  
>  Use **Masa Bot** to automate routine checks — say, “Check CPU utilization for all clusters”

