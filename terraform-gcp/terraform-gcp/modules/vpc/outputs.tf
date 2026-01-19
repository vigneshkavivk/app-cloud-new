output "vpc_network_self_link" {
  description = "Self link of the created VPC network"
  value       = google_compute_network.vpc.self_link
}

output "subnet_names" {
  description = "Names of created subnets"
  value       = [for s in google_compute_subnetwork.subnets : s.name]
}

output "firewall_rule_names" {
  description = "Names of created firewall rules"
  value       = [for r in google_compute_firewall.rules : r.name]
}
