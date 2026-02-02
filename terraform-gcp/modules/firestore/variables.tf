variable "project_id" {
  type = string
}

variable "database_id" {
  type    = string
  default = "(default)"
}

variable "location" {
  type    = string
  default = "us-central1"
}

variable "type" {
  type    = string
  default = "FIRESTORE_NATIVE"
}