provider "google" {
  project = var.project_id
}

resource "google_dns_managed_zone" "zone" {
  name        = var.zone_name
  dns_name    = var.dns_name
  description = "Managed zone for my app"
}

resource "google_dns_record_set" "record" {
  managed_zone = google_dns_managed_zone.zone.name
  name         = "${var.dns_name}."
  type         = var.record_type
  ttl          = var.ttl
  rrdatas      = var.addresses
}