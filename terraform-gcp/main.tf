module "compute" {
  source = "./modules/compute"
  project_id = var.project_id
  # ... other vars
  count = var.enable_compute ? 1 : 0
}

module "gke" {
  source = "./modules/gke"
  project_id = var.project_id
  # ... other vars
  count = var.enable_gke ? 1 : 0
}