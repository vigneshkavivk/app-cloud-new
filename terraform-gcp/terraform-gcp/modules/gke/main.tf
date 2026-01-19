provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  node_pool {
    name       = var.node_pool_name
    node_count = var.num_nodes

    node_config {
      machine_type = var.machine_type
    }
  }
}