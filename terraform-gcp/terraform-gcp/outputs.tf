# Root Outputs — Aggregates outputs from all modules

output "project_id" {
  description = "GCP Project ID used"
  value       = var.project_id
}

output "region" {
  description = "Default region used"
  value       = var.region
}

# ——— MODULE OUTPUTS ———

# Compute Engine
output "compute_instance_name" {
  description = "Name of the Compute Engine instance"
  value       = module.compute.instance_name
  depends_on  = [module.compute]
}

output "compute_instance_ip" {
  description = "External IP of the Compute Engine instance"
  value       = module.compute.instance_ip
  depends_on  = [module.compute]
}

# GKE
output "gke_cluster_name" {
  description = "Name of the GKE cluster"
  value       = module.gke.cluster_name
  depends_on  = [module.gke]
}

output "gke_endpoint" {
  description = "Endpoint of the GKE cluster"
  value       = module.gke.endpoint
  depends_on  = [module.gke]
}

# VPC
output "vpc_network_self_link" {
  description = "Self link of the VPC network"
  value       = module.vpc.vpc_network_self_link
  depends_on  = [module.vpc]
}

output "vpc_subnet_names" {
  description = "Names of created subnets"
  value       = module.vpc.subnet_names
  depends_on  = [module.vpc]
}

# Storage
output "storage_bucket_url" {
  description = "URL of the Cloud Storage bucket"
  value       = module.storage.bucket_url
  depends_on  = [module.storage]
}

# Firestore
output "firestore_database_name" {
  description = "Name of the Firestore database"
  value       = module.firestore.database_name
  depends_on  = [module.firestore]
}

# Redis
output "redis_host" {
  description = "Redis host address"
  value       = module.redis.redis_host
  depends_on  = [module.redis]
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.redis_port
  depends_on  = [module.redis]
}

# Pub/Sub
output "pubsub_topic_name" {
  description = "Pub/Sub topic name"
  value       = module.pubsub.topic_name
  depends_on  = [module.pubsub]
}

output "pubsub_subscription_name" {
  description = "Pub/Sub subscription name"
  value       = module.pubsub.subscription_name
  depends_on  = [module.pubsub]
}

# Cloud SQL
output "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.cloudsql.sql_instance_name
  depends_on  = [module.cloudsql]
}

output "cloudsql_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloudsql.connection_name
  depends_on  = [module.cloudsql]
}

# BigQuery
output "bigquery_dataset_id" {
  description = "BigQuery dataset ID"
  value       = module.bigquery.dataset_id
  depends_on  = [module.bigquery]
}

output "bigquery_table_id" {
  description = "BigQuery table ID"
  value       = module.bigquery.table_id
  depends_on  = [module.bigquery]
}

# Cloud Functions
output "cloudfunctions_url" {
  description = "Cloud Function HTTPS trigger URL"
  value       = module.functions.function_url
  depends_on  = [module.functions]
}

# App Engine
output "appengine_app_id" {
  description = "App Engine application ID"
  value       = module.appengine.app_id
  depends_on  = [module.appengine]
}

output "appengine_service_url" {
  description = "App Engine service URL"
  value       = module.appengine.service_url
  depends_on  = [module.appengine]
}

# IAM
output "iam_role_assigned" {
  description = "IAM role assigned"
  value       = module.iam.iam_role
  depends_on  = [module.iam]
}

# Cloud Run
output "cloudrun_service_url" {
  description = "Cloud Run service URL"
  value       = module.cloudrun.service_url
  depends_on  = [module.cloudrun]
}

# DNS
output "dns_zone_name" {
  description = "DNS managed zone name"
  value       = module.dns.zone_name
  depends_on  = [module.dns]
}

output "dns_record_fqdn" {
  description = "DNS record FQDN"
  value       = module.dns.record_fqdn
  depends_on  = [module.dns]
}

# Monitoring
output "monitoring_alert_policy_name" {
  description = "Monitoring alert policy name"
  value       = module.monitoring.alert_policy_name
  depends_on  = [module.monitoring]
}

# Logging
output "logging_bucket_id" {
  description = "Logging bucket ID"
  value       = module.logging.bucket_id
  depends_on  = [module.logging]
}

output "logging_sink_name" {
  description = "Logging sink name"
  value       = module.logging.sink_name
  depends_on  = [module.logging]
}