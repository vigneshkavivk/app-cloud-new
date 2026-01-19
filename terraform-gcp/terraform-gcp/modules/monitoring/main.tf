provider "google" {
  project = var.project_id
}

resource "google_monitoring_alert_policy" "policy" {
  display_name = var.alert_policy_name
  combiner     = "OR"

  conditions {
    display_name = "CPU Utilization High"

    condition_threshold {
      filter     = "metric.type=\"${var.metric_type}\" AND resource.type=\"gce_instance\""
      comparison = "COMPARISON_GT"
      threshold_value = var.threshold_percent
      duration = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = []
}