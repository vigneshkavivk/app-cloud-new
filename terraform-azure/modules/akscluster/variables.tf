# Required for all deployments
variable "location" {
  description = "Azure region"
  type        = string
}

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "module_to_deploy" {
  description = "Which module to deploy (e.g., 'aks', 'storage_account')"
  type        = string
  default     = ""
}

# AKS-specific variables
variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = ""
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_B2s"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "vnet_id" {
  description = "ID of existing Virtual Network (optional)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs (at least 2 required if vnet_id is set)"
  type        = list(string)
  default     = []

  validation {
    condition     = var.vnet_id == "" || length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required when using an existing VNet."
  }
}
