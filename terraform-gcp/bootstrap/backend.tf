# terraform-gcp/bootstrap/backend.tf

# 🗃️ Remote State Backend — Uncomment to enable
# Recommended for team/shared UI usage (prevents state conflicts)

# terraform {
#   backend "gcs" {
#     bucket = "my-terraform-state-${var.project_id}"  # Must exist first!
#     prefix = "catering-boyzz/gcp/"
#     # credentials = "/path/to/service-account.json"  # Avoid in prod — use IAM roles
#   }
# }

# 🔁 Fallback: Local state (default — safe for personal/dev)
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}