# terraform-azure/main.tf

# Define provider
provider "azurerm" {
  features {}
}

# Conditional Resource Group (always needed)
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name != "" ? var.resource_group_name : "${var.vnet_name}-rg"
  location = var.location
  tags     = var.tags
}

# Deploy VNet module only if selected
module "vnet" {
  source = "./modules/vnet"

  count = var.module_to_deploy == "vnet" ? 1 : 0

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  vnet_name           = var.vnet_name
  address_space       = var.vnet_address_space
  subnet_prefixes     = var.subnet_prefixes
  tags                = var.tags
}

# Deploy VM module only if selected
module "vm_ware" {
  source = "./modules/vm-ware"

  count = var.module_to_deploy == "vm-ware" ? 1 : 0

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  vm_name             = var.vm_name
  vm_size             = var.vm_size
  admin_username      = var.admin_username
  admin_password      = var.admin_password

  vnet_name           = module.vnet[0].vnet_name
  subnet_name         = var.subnet_name
  subnet_id           = module.vnet[0].subnet_ids[var.subnet_name]

  tags                = var.tags
}