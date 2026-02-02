# terraform-gcp/bootstrap/iam.tf

# 🤖 Service Account for Terraform (optional — for secure automation)
resource "google_service_account" "terraform" {
  project      = var.project_id
  account_id   = "tf-catering-boyzz"
  display_name = "Terraform Service Account for Catering-Boyzz UI"
}

# 🔐 Minimal required roles — add more as needed per module
resource "google_project_iam_member" "terraform_compute" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:${google_service_account.terraform.email}"
}

resource "google_project_iam_member" "terraform_storage" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.terraform.email}"
}

resource "google_project_iam_member" "terraform_network" {
  project = var.project_id
  role    = "roles/compute.networkAdmin"
  member  = "serviceAccount:${google_service_account.terraform.email}"
}

resource "google_project_iam_member" "terraform_iam" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.terraform.email}"
}