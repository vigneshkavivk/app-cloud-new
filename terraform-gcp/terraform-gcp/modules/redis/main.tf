provider "google" {
  project = var.project_id
}

resource "google_redis_instance" "cache" {
  name           = var.instance_name
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  region         = "us-central1"
}