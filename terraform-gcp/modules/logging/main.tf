resource "google_logging_bucket" "bucket" {
  bucket_id = var.bucket_name
  location  = "global"
}

resource "google_logging_project_sink" "sink" {
  name            = var.sink_name
  destination     = "storage.googleapis.com/${google_logging_bucket.bucket.bucket_id}"
  filter          = var.filter != null ? var.filter : "logName:\"projects/${var.project_id}/logs/cloudaudit.googleapis.com%2Factivity\""
  include_children = true
}