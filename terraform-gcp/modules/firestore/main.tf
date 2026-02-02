provider "google" {
  project = var.project_id
}

resource "google_firestore_database" "db" {
  project    = var.project_id
  name       = var.database_id
  location_id = var.location
  type       = var.type
}