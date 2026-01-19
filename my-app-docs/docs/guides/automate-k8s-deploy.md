# Automate Kubernetes Deployment

Deploy your app to Kubernetes with zero manual steps.

## Step 1: Prepare Your App

Ensure your app has:
- Dockerfile
- Kubernetes manifest (`deployment.yaml`, `service.yaml`)

## Step 2: Create a Workflow

1. Go to **Work Flow**
2. Click **+ New Workflow**
3. Add steps:
   - Build Docker image
   - Push to registry
   - Deploy to cluster

## Step 3: Trigger on Git Push

1. Connect your repo in **SCM Connector**
2. Set trigger: “On push to main branch”
3. Save and test

## Step 4: Monitor

Check **Dashboard > Workflows** for real-time status.



> 💡 Use environment variables to switch between dev/staging/prod.