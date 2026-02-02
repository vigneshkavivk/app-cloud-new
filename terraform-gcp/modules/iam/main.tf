provider "google" {
  project = var.project_id
}

resource "google_project_iam_member" "member" {
  project = var.project_id
  role    = var.role
  member  = "user:${var.user_email}"
}