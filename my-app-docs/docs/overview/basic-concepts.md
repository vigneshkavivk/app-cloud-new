# Basic Concepts

Understanding these key terms will help you navigate CloudMaSa effectively.

### 1. Dashboard
Your central command center — a real-time overview of all workspaces, clusters, workflows, and alerts in one place.

View live resource utilization, deployment status, and policy violations
Customize widgets: cluster health, recent logs, cost trends
Get instant notifications for critical events, such as failed deployments

### 2. Workspace
A Workspace is a project container where you group related resources such as clusters, workflows, and databases.

Use separate workspaces for development, staging, and production environments
Name workspaces clearly (for example, ProjectX-Dev)
Assign user roles: Admin, Editor, or Viewer

### 3. Cloud Connector
Securely connect and manage cloud accounts (AWS, GCP, Azure) with role-based access.

Auto-discover regions, VPCs, and existing resources
Uses short-lived IAM tokens — no long-term secrets are stored
One connector per cloud account; reusable across workspaces

### 4. Cluster
Manage Kubernetes clusters across cloud providers from a single interface.

Supported platforms: Amazon EKS, Google GKE, Azure AKS, and self-managed Kubernetes
Monitor real-time metrics including CPU and memory usage, pod status, and node health
Scale manually or configure auto-scaling based on workload demand

### 5. Workflow
Automate your CI/CD pipelines with the visual workflow builder.

Drag-and-drop steps such as Build, Test, Deploy, and Notify
Triggers include Git push events, scheduled runs, or manual execution
Use predefined variables (for example,(`{{GIT_BRANCH}}`) ) or define custom ones(`{{GIT_BRANCH}}`)

### 6. SCM Connector
Integrate with source code repositories such as GitHub, GitLab, and Bitbucket for GitOps workflows.

Automatically sync repositories, branches, and webhooks
Uses OAuth-based authentication — no personal access tokens or passwords required
Browse files and commit history directly within CloudMaSa

### 7. Tools
Pre-integrated DevOps tools accessible from your workspace.

Included tools: Argo CD, Grafana, Prometheus, Loki, Jenkins, and Terraform
Launch any tool with one click — no manual installation or configuration
Tools are auto-configured with your clusters and credentials

### 8. Database
Manage cloud and self-hosted databases alongside your infrastructure.

Supported databases: Amazon RDS, Google Cloud SQL, PostgreSQL, MySQL, and MongoDB
View schema, run queries, and monitor performance metrics
Perform backups, restores, and clones using built-in workflows

### 9. Policies
Define security, compliance, and operational rules for your infrastructure.

Built-in policy templates for enforcing HTTPS, disabling root access, and cost alerts
Apply policies at the workspace, cluster, or global level
Choose between Audit Mode (log violations) or Enforce Mode (block non-compliant actions)

### 10. MaSa Bot
Your AI-powered DevOps assistant for answering questions, suggesting configurations, and automating tasks.

Request examples such as “Show me a sample workflow for Node.js”
Use natural language commands like “I want to deploy my app to AWS”
Review and approve all bot-proposed actions before execution

### 11. Security Management
Enterprise-grade security for your entire DevOps lifecycle.

