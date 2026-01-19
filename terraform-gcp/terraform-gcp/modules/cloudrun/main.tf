provider "google" {
  project = var.project_id
}

resource "google_cloud_run_service" "service" {
  name     = var.service_name
  location = "us-central1"

  template {
    spec {
      containers {
        image = var.container_image
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}