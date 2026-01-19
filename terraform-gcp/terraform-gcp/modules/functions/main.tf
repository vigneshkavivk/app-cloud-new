provider "google" {
  project = var.project_id
}

resource "google_cloudfunctions_function" "fn" {
  name                  = var.function_name
  runtime               = var.runtime
  available_memory_mb   = 128
  source_archive_bucket = "my-source-bucket" # you may need to create this first
  trigger_http          = var.trigger_http

  entry_point = "helloWorld"

  # You’d typically upload source code via gsutil or CI/CD
  # For simplicity, we assume bucket exists
}