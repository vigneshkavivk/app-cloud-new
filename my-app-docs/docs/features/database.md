# Database

CloudMaSa lets you **provision, configure, and manage** databases directly from your DevOps dashboard — no need to log into separate consoles or write complex YAML.

Whether you need a relational SQL database, a document store, or a time-series engine, CloudMaSa provides one-click setup, secure connectivity, and lifecycle management.



##   Supported Databases

CloudMaSa supports 8+ databases across three categories:

###   Relational (SQL)
- **MySQL**: Battle-tested, high-performance RDBMS for web apps and services.
- **PostgreSQL**: Advanced open-source database with JSON support, geospatial, and strong ACID compliance.
- **MariaDB**: A drop-in MySQL replacement with enhanced performance and features.

>   Use relational databases for structured data, transactions, and complex queries — ideal for ERP, CRM, and financial systems.



###   Document & NoSQL
- **docDB**: AWS’s MongoDB-compatible database — scale document workloads without managing servers.
- **Couchbase**: Distributed NoSQL database optimized for interactive applications and mobile backends.

>   Choose NoSQL for flexible schemas, horizontal scaling, and high-throughput ingestion — perfect for user profiles, catalogs, and event logging.



###   Time-Series
- **InfluxDB**: Purpose-built for metrics, monitoring, and real-time analytics.
- **VictoriaMetrics**: High-performance, cost-efficient alternative for Prometheus-scale workloads.

>   Use time-series databases for DevOps observability — store CPU, memory, latency, and custom metrics with millisecond precision.



###   Schema Management
- **Liquibase**: Open-source tool to manage database schema changes as version-controlled code.

>   Track, review, and deploy schema changes safely — no more `ALTER TABLE` run by hand.



##   How CloudMaSa Helps

### One-Click Provisioning
Instead of writing Terraform or CloudFormation:
1. Go to **Database → PostgreSQL**
2. Select your cloud account and region
3. Set name, size, credentials
4. Click **Create**

  CloudMaSa handles VPC, security groups, backups, and monitoring automatically.



### Unified Monitoring
View live metrics for all databases in one place:
- CPU & memory usage  
- Connection count  
- Query latency  
- Storage growth  

>   Integrated with Prometheus + Grafana (no extra setup needed).



### Secure by Default
- Credentials stored in **HashiCorp Vault** (if connected)
- All connections use **SSL/TLS**
- Access controlled via **RBAC** (only authorized team members can view or modify)



### Lifecycle Management
- **Pause/Resume** databases to save costs
- **Resize** storage or compute on-demand
- **Backup & Restore** with one click
- **Delete** when no longer needed (with confirmation)



## 💡 When to Use Which?

| Use Case | Recommended Database |
|--------|----------------------|
| Web app with user accounts | MySQL / PostgreSQL |
| IoT or sensor data | InfluxDB / VictoriaMetrics |
| Content management, catalogs | docDB (MongoDB) |
| Mobile app backend | Couchbase |
| Audit logs, financial records | PostgreSQL (with row-level security) |
| CI/CD pipeline metadata | MySQL |



> 💡 **Pro Tip**: Use **Masa Bot** to ask:  
> _“Which database should I use for a real-time dashboard?”_  
> _“Create a PostgreSQL DB for my staging environment”_



You now have a **complete, self-contained, CloudMaSa-focused database guide** — no external links, no generic marketing fluff — just clear, actionable DevOps knowledge.

Let me know if you'd like to add:
- Screenshots of your UI
- CLI examples (`cloudmasa db create`)
- Terraform snippets (for advanced users)
