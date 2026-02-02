# terraform-azure/variables.tf

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = ""
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags for resources"
  type        = map(string)
  default     = {
    environment = "dev"
  }
}

# VNet Module Variables
variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
  default     = "default-vnet"
}

variable "vnet_address_space" {
  description = "CIDR block for VNet"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_prefixes" {
  description = "Map of subnet names to CIDR blocks"
  type        = map(string)
  default     = {
    "subnet1" = "10.0.1.0/24"
  }
}

# VM Module Variables
variable "vm_name" {
  description = "Name of the VM"
  type        = string
  default     = "default-vm"
}

variable "vm_size" {
  description = "VM size"
  type        = string
  default     = "Standard_B1s"
}

variable "admin_username" {
  description = "Admin username for VM"
  type        = string
  default     = "azureuser"
}

variable "admin_password" {
  description = "Admin password for VM"
  type        = string
  default     = "P@ssw0rd123!"
}

variable "subnet_name" {
  description = "Name of the subnet to attach VM"
  type        = string
  default     = "subnet1"
}

variable "module_to_deploy" {
  description = "Which module to deploy: 'vnet' or 'vm-ware'"
  type        = string
  default     = "none"
}

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
