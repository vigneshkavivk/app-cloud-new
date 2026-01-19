provider "google" {
  project = var.project_id
}

resource "google_app_engine_application" "app" {
  project = var.project_id
  auth_domain = "gmail.com"
  location_id = "us-central"
}

resource "google_app_engine_service" "service" {
  project = var.project_id
  service = var.service

  version {
    version_id = var.version
    automatic_scaling {
      max_instances = 10
    }
    runtime = "nodejs18"
    entrypoint = "npm start"
    # Add more config as needed
  }
}