# terraform-gcp/bootstrap/provider.tf

# 🔐 Google Provider Configuration
# Uses Application Default Credentials (ADC) by default — ideal for your Node.js backend
# Alternatively: use service account key (not recommended for prod)

provider "google" {
  project = var.project_id
  region  = var.region

  # Optional: Use workload identity federation (secure for CI/CD or backend services)
  # impersonate_service_account = "terraform@${var.project_id}.iam.gserviceaccount.com"

  # Robust retry settings (great for UI-triggered applies)
  request_timeout = "60s"
  batch_send_timeout = "30s"

  # Skip credential validation in UI backend (faster plan/apply)
  skip_credentials_validation = false
  skip_project_validation     = false
}

# 🔒 Optional: Dedicated provider for IAM (avoids project-level conflicts)
provider "google" {
  alias   = "iam"
  project = var.project_id
  region  = var.region
}