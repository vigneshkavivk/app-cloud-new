provider "google" {
  project = var.project_id
}

resource "google_bigquery_dataset" "dataset" {
  dataset_id = var.dataset_id
  location   = var.location
}

resource "google_bigquery_table" "table" {
  dataset_id = google_bigquery_dataset.dataset.dataset_id
  table_id   = var.table_id

  schema = jsonencode([
    {
      name = "name"
      type = "STRING"
    },
    {
      name = "age"
      type = "INTEGER"
    }
  ])
}