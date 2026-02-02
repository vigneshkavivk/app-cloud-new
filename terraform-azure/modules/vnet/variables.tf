# modules/vnet/variables.tf

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "vnet_name" {
  type = string
}

variable "address_space" {
  type = string
}

variable "subnet_prefixes" {
  type = map(string)
}

variable "tags" {
  type = map(string)
}