# Cloud Connector

Connect your AWS, GCP, or Azure accounts to manage cloud infrastructure from a single dashboard.



## Connect Your Cloud Account

To connect a new cloud account:

<img 
  src="/images/cloudconnector.png" 
  alt="CloudConnector" 
  style={{ width: '90%', height: 'auto', display: 'block', margin: '0 auto' }} 
/>

1. Click **+ Create Workspace** (top-right corner) → **Cloud Connector**
2. In the **Choose Cloud Provider** dropdown, select:
   - **Amazon Web Services (AWS)**
   - **Microsoft Azure**
   - **Google Cloud Platform (GCP)**

> 💡 Pro Tip: Use **Masa Bot** to say, “Connect my AWS account” — it will guide you through the process!



## Connected Cloud Accounts

View all your connected cloud accounts in one place.

### Account Card

Each connected account shows:

- **Provider** — The cloud platform (e.g., `AWS Cloud`)
- **Account** — Your account name (e.g., `jaga_cm`)
- **Region** — Where your resources are deployed (e.g., `us-east-1`)
- **Account ID** — Last 6 digits of your account ID (e.g., `...000198`)
- **Status** — `Connected` (green badge)

>   To disconnect an account, click the **red X** button.



## Supported Providers

### Amazon Web Services (AWS)

To connect an AWS account, you provide an IAM access key and secret key from a dedicated user (not the root account).

- Required permissions: A custom IAM policy that grants least-privilege access to services like EC2, S3, EKS, IAM, and CloudFormation.
- Validation: CloudMaSa tests the connection in real time and reports missing permissions.
- Security: Credentials are encrypted at rest and never logged or exposed in the UI.
- Use case: Manage EKS clusters, auto-scaling groups, S3 buckets, and more—all from the CloudMaSa console.

### Google Cloud Platform (GCP)
GCP integration uses a service account key file (JSON) and a Project ID.

- Required roles: Assign roles like Compute Viewer, Kubernetes Engine Admin, and Storage Admin to the service account—only what’s needed.
- Auto-detection: If your key includes the project ID, CloudMaSa fills it in automatically.
- Validation: A “Test Connection” button confirms API access before saving.
- Use case: Deploy GKE clusters, manage Cloud SQL instances, or provision Cloud Functions without leaving the platform


### Microsoft Azure

Azure connections use a Service Principal—defined by Tenant ID, Client ID, and Client Secret—along with a Subscription ID.

- Required permissions: The Service Principal must have at least the Contributor role on the target resource group or subscription.
- Validation: CloudMaSa checks for required Azure Resource Manager (ARM) permissions during setup.
- Security: Secrets are stored in an encrypted vault; no plaintext exposure.
- Use case: Provision AKS clusters, manage Blob Storage, or deploy Virtual Machine Scale Sets with full auditability.



## How It Works Behind the Scenes
- All cloud connections are stored per workspace, so teams can manage their own accounts without cross-access.
- Credentials are never used in browser-side code—all API calls happen server-side.
- Every action (scan, deploy, delete) is logged with user, timestamp, and target resource.
- Connections support multi-account / multi-project / multi-subscription setups out of the box.
- Once connected, your cloud provider appears in the Work Flow, Clusters, and Cloud Accounts views—ready for automation.



> 💡 Pro Tip: Use **Masa Bot** to ask, “Show me all my connected accounts” or “Disconnect my GCP account.”

Let me know if you’d like to dive deeper into any provider!