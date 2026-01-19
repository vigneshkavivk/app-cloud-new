provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# Always create RG (safe even if exists)
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Log Analytics for monitoring (required by oms_agent)
resource "azurerm_log_analytics_workspace" "law" {
  count               = var.module_to_deploy == "aks" ? 1 : 0
  name                = "${var.resource_group_name}-law"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
}

resource "azurerm_log_analytics_solution" "container_insights" {
  count                 = var.module_to_deploy == "aks" ? 1 : 0
  solution_name         = "ContainerInsights"
  location              = azurerm_resource_group.rg.location
  resource_group_name   = azurerm_resource_group.rg.name
  workspace_resource_id = azurerm_log_analytics_workspace.law[0].id
  workspace_name        = azurerm_log_analytics_workspace.law[0].name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/ContainerInsights"
  }
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  count               = var.module_to_deploy == "aks" ? 1 : 0
  name                = var.cluster_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  # Network profile is required when using existing VNet
  dynamic "network_profile" {
    for_each = var.vnet_id != "" ? [1] : []
    content {
      network_plugin    = "azure"
      network_policy    = "azure"
      load_balancer_sku = "standard"
    }
  }

  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.vm_size
    # Assign to first subnet if using existing VNet
    vnet_subnet_id = var.vnet_id != "" ? var.subnet_ids[0] : null
  }

  identity {
    type = "SystemAssigned"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.law[0].id
  }

  tags = {
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}
