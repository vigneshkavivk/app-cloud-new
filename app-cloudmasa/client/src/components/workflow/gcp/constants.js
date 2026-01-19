export const modules = [
  {
    id: "compute",
    name: "Compute Engine",
    price: { instance: 0.05 },
    description: "Launch virtual machines on Google Cloud Platform.",
    requirements: ["VPC", "Zone"],
    iacResources: ["google_compute_instance", "google_compute_network", "google_compute_subnetwork"]
  },
  {
    id: "gke",
    name: "Google Kubernetes Engine",
    price: { cluster: 0.1, node: 0.2 },
    description: "Managed Kubernetes service for deploying containerized applications.",
    requirements: ["VPC", "Cluster", "Node Pool"],
    iacResources: ["google_container_cluster", "google_container_node_pool"]
  },
  {
    id: "vpc",
    name: "VPC Network",
    price: { network: 0.01 },
    description: "Define a private, isolated network for your GCP resources.",
    requirements: ["CIDR Block", "Subnets", "Firewall Rules"],
    iacResources: ["google_compute_network", "google_compute_subnetwork", "google_compute_firewall"]
  },
  {
    id: "storage",
    name: "Cloud Storage",
    price: { storage: 0.02 },
    description: "Scalable object storage for data backup, archiving, and content delivery.",
    requirements: ["Bucket Name", "Storage Class", "Location"],
    iacResources: ["google_storage_bucket"]
  },
  {
    id: "firestore",
    name: "Firestore",
    price: { read: 0.06, write: 0.18, delete: 0.06, storage: 0.18 },
    description: "NoSQL document database for mobile and web applications.",
    requirements: ["Database ID", "Location", "Mode (Native/Enterprise)"],
    iacResources: ["google_firestore_database"]
  },
  {
    id: "redis",
    name: "Cloud Memorystore for Redis",
    price: { memory: 0.15 },
    description: "Fully managed Redis service for high-performance caching and session management.",
    requirements: ["Instance Name", "Memory Size", "Tier"],
    iacResources: ["google_redis_instance"]
  },
  {
    id: "pubsub",
    name: "Pub/Sub",
    price: { publish: 0.0000007, subscribe: 0.0000007 },
    description: "Reliable, scalable messaging service for event-driven architectures.",
    requirements: ["Topic", "Subscription"],
    iacResources: ["google_pubsub_topic", "google_pubsub_subscription"]
  },
  {
    id: "cloudsql",
    name: "Cloud SQL",
    price: { instance: 0.1, storage: 0.17 },
    description: "Fully managed relational database service for MySQL, PostgreSQL, and SQL Server.",
    requirements: ["Instance Name", "Database Type", "Region"],
    iacResources: ["google_sql_database_instance", "google_sql_database"]
  },
  {
    id: "bigquery",
    name: "BigQuery",
    price: { query: 5.00, storage: 0.02 },
    description: "Serverless, highly scalable data warehouse for analytics.",
    requirements: ["Dataset", "Table", "Location"],
    iacResources: ["google_bigquery_dataset", "google_bigquery_table"]
  },
  {
    id: "functions",
    name: "Cloud Functions",
    price: { invocations: 0.0000002, duration: 0.0000002 },
    description: "Serverless compute service to run code in response to events.",
    requirements: ["Function Name", "Runtime", "Trigger"],
    iacResources: ["google_cloudfunctions_function"]
  },
  {
    id: "appengine",
    name: "App Engine",
    price: { instance: 0.05, storage: 0.02 },
    description: "Fully managed platform for building and hosting web applications.",
    requirements: ["Application ID", "Service", "Version"],
    iacResources: ["google_app_engine_application", "google_app_engine_service"]
  },
  {
    id: "iam",
    name: "IAM",
    price: { free: 0 },
    description: "Identity and Access Management for controlling access to GCP resources.",
    requirements: ["User", "Role", "Policy"],
    iacResources: ["google_project_iam_member", "google_service_account"]
  },
  {
    id: "cloudrun",
    name: "Cloud Run",
    price: { requests: 0.0000002, duration: 0.0000002 },
    description: "Serverless platform for running containers without managing servers.",
    requirements: ["Service Name", "Container Image", "CPU/Memory"],
    iacResources: ["google_cloud_run_service"]
  },
  {
    id: "dns",
    name: "Cloud DNS",
    price: { hostedZone: 0.20, record: 0.0001 },
    description: "Managed DNS service for routing traffic to your services.",
    requirements: ["Zone Name", "Record Set", "TTL"],
    iacResources: ["google_dns_managed_zone", "google_dns_record_set"]
  },
  {
    id: "monitoring",
    name: "Cloud Monitoring",
    price: { metrics: 0.30, logs: 0.57 },
    description: "Monitor, alert, and analyze the performance of your GCP resources.",
    requirements: ["Metric", "Alert Policy", "Dashboard"],
    iacResources: ["google_monitoring_alert_policy", "google_monitoring_dashboard"]
  },
  {
    id: "logging",
    name: "Cloud Logging",
    price: { logs: 0.57 },
    description: "Centralized logging service for collecting and analyzing logs from your applications.",
    requirements: ["Log Bucket", "Sink", "Filter"],
    iacResources: ["google_logging_project_sink", "google_logging_bucket"]
  }
]
