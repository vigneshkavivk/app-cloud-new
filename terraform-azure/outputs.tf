# outputs.tf (FIXED)

output "vm_public_ip" {
  value = try(module.vm_ware[0].vm_public_ip, null)
  description = "Public IP of the VM (if deployed)"
}

output "vnet_name" {
  value = try(module.vnet[0].vnet_name, null)
  description = "Name of the VNet (if deployed)"
}

output "subnet_ids" {
  value = try(module.vnet[0].subnet_ids, {})
  description = "Subnet IDs (if VNet deployed)"
}