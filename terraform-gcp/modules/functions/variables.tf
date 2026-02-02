variable "project_id" {
  type = string
}

variable "function_name" {
  type = string
}

variable "runtime" {
  type    = string
  default = "nodejs18"
}

variable "source_dir" {
  type    = string
  default = "./src"
}

variable "trigger_http" {
  type    = bool
  default = true
}