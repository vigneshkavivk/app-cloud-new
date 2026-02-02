provider "google" {
  project = var.project_id
}

resource "google_pubsub_topic" "topic" {
  name = var.topic_name
}

resource "google_pubsub_subscription" "sub" {
  name  = var.subscription_name
  topic = google_pubsub_topic.topic.name
}