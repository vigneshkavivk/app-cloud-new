output "app_id" {
  value = google_app_engine_application.app.name
}

output "service_url" {
  value = "https://${google_app_engine_application.app.default_hostname}"
}