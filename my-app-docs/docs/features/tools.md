# Tools

Manage your entire DevOps toolchain from one dashboard — no more switching between consoles.

CloudMaSa provides **unified control** over 20+ popular DevOps tools, including:

-   CI/CD: Jenkins, GitLab, Argo CD
-   Security & Compliance: OPA Gatekeeper, Keycloak, HashiCorp Vault
-   Monitoring & Observability: Prometheus, Grafana, Loki
-   Artifact & Dependency Management: Nexus, SonarQube
-   Container & Cluster: Kubernetes, Harbor, KEDA
-   Code & Testing: Sourcegraph, ReportPortal, Jaeger

---

##   How It Works

### 1. **Add or Connect a Tool**

1. Go to **Tools** in the sidebar
2. Click **Configure** next to any tool (e.g., Jenkins)
3. Enter connection details (API key, URL, credentials)
4. Click **Save**

> 💡 Pro Tip: Use **Masa Bot** to say, “Connect my Jenkins instance” — it will guide you through the process!

---

##   Tool Descriptions

###   Argo CD

**A Kubernetes-native continuous deployment and workflow engine for GitOps.**

- **Category**: GitOps
- **URL**: [argoproj.github.io](https://argoproj.github.io)
- **Status**: Not Configured → Configure → Ready

>   Use Argo CD to automate deployments based on Git repo changes.

---

###   GitLab

**A web-based DevOps lifecycle tool for Git repo management, CI/CD, and incident response.**

- **Category**: Version Control, CI/CD
- **URL**: [gitlab.com](https://gitlab.com)
- **Status**: Not Configured → Configure → Ready

>   Manage your entire software lifecycle — from code to production — in one place.



###   Jenkins

**An extensible open-source automation server for continuous integration and delivery.**

- **Category**: CI/CD
- **URL**: [www.jenkins.io](https://www.jenkins.io)
- **Status**: Deploying... → Ready

>   Automate builds, tests, and deployments with plugins for every stack.



###   Prometheus

**A monitoring system and time series database for real-time metrics and alerting.**

- **Category**: Monitoring
- **URL**: [prometheus.io](https://prometheus.io)
- **Status**: Not Configured → Configure → Ready

>   Collect, store, and query metrics from your infrastructure.



###   Grafana

**An open-source analytics and monitoring solution — visualize metrics, logs, and traces.**

- **Category**: Monitoring
- **URL**: [grafana.com](https://grafana.com)
- **Status**: Not Configured → Configure → Ready

>   Create dashboards for your teams — from simple graphs to complex SLOs.



###   Loki

**A horizontally-scalable, highly-available log aggregation system by Grafana — optimized for cost and speed.**

- **Category**: Logging
- **URL**: [grafana.com](https://grafana.com)
- **Status**: Not Configured → Configure → Ready

>   Store and search logs at scale — perfect for Kubernetes environments.



###   Nexus

**A repository manager to store, retrieve, and manage build artifacts and dependencies.**

- **Category**: Artifact Repository
- **URL**: [www.sonatype.com](https://www.sonatype.com)
- **Status**: Not Configured → Configure → Ready

>   Centralize your artifacts — Maven, npm, Docker, Helm — in one place.



###   SonarQube

**Continuous code quality and security analysis — find bugs, vulnerabilities, and code smells.**

- **Category**: Code Quality
- **URL**: [sonarqube.org](https://sonarqube.org)
- **Status**: Not Configured → Configure → Ready

>   Enforce clean, secure code across your team.



###   HashiCorp Vault

**A tool for securely managing secrets, encryption keys, and identity-based access.**

- **Category**: Secrets Management
- **URL**: [vaultproject.io](https://vaultproject.io)
- **Status**: Not Configured → Configure → Ready

>   Protect sensitive data — API keys, passwords, certificates — with dynamic secrets and policies.



###   Keycloak

**An open-source identity and access management solution for modern applications.**

- **Category**: Identity Management
- **URL**: [www.keycloak.org](https://www.keycloak.org)
- **Status**: Not Configured → Configure → Ready

>   Add SSO, OAuth2, OpenID Connect to your apps — fast and secure.



###   Kubernetes

**An open-source system for automating deployment, scaling, and management of containerized applications.**

- **Category**: Container Orchestration
- **URL**: [kubernetes.io](https://kubernetes.io)
- **Status**: Not Configured → Configure → Ready

>   Manage your clusters — deploy, scale, and monitor — from CloudMaSa.



###   NGINX

**A high-performance web server, reverse proxy, and load balancer.**

- **Category**: Web Server
- **URL**: [nginx.org](https://nginx.org)
- **Status**: Not Configured → Configure → Ready

>   Route traffic, cache content, and secure your services with NGINX.



###   Harbor

**A trusted cloud-native registry for storing, signing, and scanning container images.**

- **Category**: Container Registry
- **URL**: [goharbor.io](https://goharbor.io)
- **Status**: Not Configured → Configure → Ready

>   Secure your container supply chain — scan for vulnerabilities, sign images, enforce policies.



###   Sourcegraph

**A universal code search and intelligence platform for large-scale codebases.**

- **Category**: Code Search
- **URL**: [sourcegraph.com](https://sourcegraph.com)
- **Status**: Not Configured → Configure → Ready

>   Search, navigate, and understand your codebase — across repos, languages, and teams.



###   ReportPortal

**An AI-powered test reporting and analytics platform for QA and DevOps teams.**

- **Category**: Test Reporting
- **URL**: [reportportal.io](https://reportportal.io)
- **Status**: Not Configured → Configure → Ready

>   Track test results, analyze flakiness, and improve release quality with AI insights.



###   OPA Gatekeeper

**A policy controller for Kubernetes — enforce compliance, security, and operational best practices.**

- **Category**: Policy Enforcement
- **URL**: [openpolicyagent.org](https://openpolicyagent.org)
- **Status**: Not Configured → Configure → Ready

>   Define and enforce policies — e.g., “All pods must have resource limits”.



###   Thanos

**A set of components to create a highly available, long-term Prometheus monitoring stack.**

- **Category**: Monitoring
- **URL**: [thanos.io](https://thanos.io)
- **Status**: Not Configured → Configure → Ready

>   Scale Prometheus for long-term storage, global querying, and high availability.



##   Best Practices

>  Always use **dedicated service accounts** for tools (never personal credentials)  
>  Enable **auditing** for critical tools (Keycloak, Vault, OPA)  
>  Regularly review **tool status** and **connection health**  
>  Use **Masa Bot** to automate setup — say, “Configure Prometheus” or “Start Jenkins”



Let me know if you’d like to add:
-   **Metrics** for each tool (e.g., “Last synced: 5 minutes ago”)
-   **Integration guides** for specific tools
-   **Masa Bot commands** for each tool

