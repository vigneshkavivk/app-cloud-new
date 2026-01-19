provider "google" {
  project = var.project_id
  region  = var.region
}

# Create VPC Network
resource "google_compute_network" "vpc" {
  name                    = var.network_name
  auto_create_subnetworks = false
}

# Create Subnets
resource "google_compute_subnetwork" "subnets" {
  for_each = { for s in var.subnets : s.name => s }

  name          = each.value.name
  region        = each.value.region
  network       = google_compute_network.vpc.self_link
  ip_cidr_range = each.value.cidr
}

# Create Firewall Rules
resource "google_compute_firewall" "rules" {
  for_each = { for r in var.firewall_rules : r.name => r }

  name    = each.value.name
  network = each.value.network == "default" ? google_compute_network.vpc.self_link : each.value.network

  allow {
    protocol = each.value.allow[0].protocol
    ports    = each.value.allow[0].ports
  }

  source_ranges = each.value.source_ranges
}
