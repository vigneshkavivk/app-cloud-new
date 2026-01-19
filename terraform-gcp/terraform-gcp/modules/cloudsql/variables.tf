variable "project_id" {
  type = string
}

variable "instance_name" {
  type = string
}

variable "database_version" {
  type    = string
  default = "POSTGRES_15"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "tier" {
  type    = string
  default = "db-f1-micro"
}