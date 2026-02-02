output "aks_cluster_name" {
  value = var.module_to_deploy == "aks" ? azurerm_kubernetes_cluster.aks[0].name : ""
}

output "resource_group" {
  value = azurerm_resource_group.rg.name
}

output "cluster_id" {
  value = var.module_to_deploy == "aks" ? azurerm_kubernetes_cluster.aks[0].id : ""
}
