resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  # Merge user-provided tags with required labels
  tags = merge(
    var.tags,
    {
      ManagedBy     = "Terraform"
      DeploymentId  = var.deployment_id  # 👈 CRITICAL FOR COST TRACKING
    }
  )
}

# Optional: ECR lifecycle policy
resource "aws_ecr_lifecycle_policy" "this" {
  count      = var.lifecycle_policy != null ? 1 : 0
  repository = aws_ecr_repository.this.name
  policy     = var.lifecycle_policy
}
