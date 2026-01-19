output "bucket_id" {
  value = google_logging_bucket.bucket.bucket_id
}

output "sink_name" {
  value = google_logging_project_sink.sink.name
}