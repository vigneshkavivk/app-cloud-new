# Global Variables for GCP Infrastructure

variable "project_id" {
  description = "GCP Project ID where resources will be created"
  type        = string
  validation {
    condition     = length(var.project_id) > 0
    error_message = "Project ID cannot be empty."
  }
}

variable "region" {
  description = "Default region for GCP resources (if not overridden per module)"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Default zone for zonal resources (e.g., Compute Engine)"
  type        = string
  default     = "us-central1-a"
}

# Optional: Common tags or labels
variable "labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default     = {}
}

# Optional: Enable/disable modules (for UI toggle)
variable "enable_compute" {
  description = "Enable Compute Engine module"
  type        = bool
  default     = true
}

variable "enable_gke" {
  description = "Enable GKE module"
  type        = bool
  default     = true
}

variable "enable_vpc" {
  description = "Enable VPC module"
  type        = bool
  default     = true
}

variable "enable_storage" {
  description = "Enable Cloud Storage module"
  type        = bool
  default     = true
}

variable "enable_firestore" {
  description = "Enable Firestore module"
  type        = bool
  default     = true
}

variable "enable_redis" {
  description = "Enable Redis module"
  type        = bool
  default     = true
}

variable "enable_pubsub" {
  description = "Enable Pub/Sub module"
  type        = bool
  default     = true
}

variable "enable_cloudsql" {
  description = "Enable Cloud SQL module"
  type        = bool
  default     = true
}

variable "enable_bigquery" {
  description = "Enable BigQuery module"
  type        = bool
  default     = true
}

variable "enable_functions" {
  description = "Enable Cloud Functions module"
  type        = bool
  default     = true
}

variable "enable_appengine" {
  description = "Enable App Engine module"
  type        = bool
  default     = true
}

variable "enable_iam" {
  description = "Enable IAM module"
  type        = bool
  default     = true
}

variable "enable_cloudrun" {
  description = "Enable Cloud Run module"
  type        = bool
  default     = true
}

variable "enable_dns" {
  description = "Enable DNS module"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable Monitoring module"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable Logging module"
  type        = bool
  default     = true
}