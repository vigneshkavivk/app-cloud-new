output "zone_name" {
  value = google_dns_managed_zone.zone.name
}

output "record_fqdn" {
  value = google_dns_record_set.record.name
}