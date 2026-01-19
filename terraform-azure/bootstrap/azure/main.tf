# terraform/bootstrap/azure/main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
}

# 🔹 Resource Group for state infrastructure
resource "azurerm_resource_group" "state_rg" {
  name     = var.resource_group_name
  location = var.location
}

# 🔹 Storage Account (Blob + Table)
resource "azurerm_storage_account" "state_sa" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.state_rg.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Cheapest, sufficient for state
  min_tls_version          = "TLS1_2"

  # 🔒 Enable soft delete for blobs (7 days) — safety net
  blob_properties {
    delete_retention_policy {
      days = 7
    }
  }
}

# 🔹 Blob Container for .tfstate files
resource "azurerm_storage_container" "state_container" {
  name                  = var.container_name
  storage_account_name  = azurerm_storage_account.state_sa.name
  container_access_type = "private" # 🔐 Must be private!
}

# 🔹 Table for Terraform state locking
resource "azurerm_storage_table" "state_locks" {
  name                 = var.table_name
  storage_account_name = azurerm_storage_account.state_sa.name
}