provider "google" {
  project = var.project_id
}

resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = var.database_version
  region           = var.region

  settings {
    tier = var.tier
  }
}

resource "google_sql_database" "db" {
  name     = "mydb"
  instance = google_sql_database_instance.instance.name
}