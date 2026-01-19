# terraform/bootstrap/azure/variables.tf

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
}

variable "client_id" {
  description = "Service Principal Client ID"
  type        = string
}

variable "client_secret" {
  description = "Service Principal Client Secret"
  type        = string
  sensitive   = true
}

variable "location" {
  description = "Azure region (e.g., eastus, centralindia)"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Name of the Resource Group for state resources"
  type        = string
}

variable "storage_account_name" {
  description = "Globally unique Storage Account name (3-24 chars, lowercase/numbers)"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "Storage account name must be 3-24 chars, lowercase letters and numbers only."
  }
}

variable "container_name" {
  description = "Name of the Blob container for .tfstate"
  type        = string
  default     = "tfstate"
}

variable "table_name" {
  description = "Name of the Table for Terraform locks"
  type        = string
  default     = "terraformlocks"
}