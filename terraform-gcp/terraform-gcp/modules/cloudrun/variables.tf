variable "project_id" {
  type = string
}

variable "service_name" {
  type = string
}

variable "container_image" {
  type = string
}

variable "cpu" {
  type    = number
  default = 1
}

variable "memory" {
  type    = string
  default = "512Mi"
}