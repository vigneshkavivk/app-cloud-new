provider "google" {
  project = var.project_id
  region  = "us-central1"
}

resource "google_compute_instance" "vm" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = var.image
    }
  }

  network_interface {
    network = var.network
  }

  metadata_startup_script = "echo 'Hello from GCP!'"
}