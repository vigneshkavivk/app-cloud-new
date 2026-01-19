variable "project_id" {
  type = string
}

variable "zone_name" {
  type = string
}

variable "dns_name" {
  type = string
}

variable "record_type" {
  type    = string
  default = "A"
}

variable "ttl" {
  type    = number
  default = 300
}

variable "addresses" {
  type    = list(string)
  default = ["1.2.3.4"]
}