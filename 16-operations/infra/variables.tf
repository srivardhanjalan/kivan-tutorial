variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  default     = "production"
}

variable "apprunner_cpu" {
  description = "CPU units for App Runner (1024 = 1 vCPU, 2048 = 2 vCPU)"
  type        = string
  default     = "1024"
}

variable "apprunner_memory" {
  description = "Memory for App Runner (2048 = 2GB, 4096 = 4GB)"
  type        = string
  default     = "2048"
}

variable "budget_alert_email" {
  description = "Email address subscribed to the operational alert topic; the subscription is created but stays PendingConfirmation until this inbox confirms it"
  type        = string
  default     = "alerts@example.com" # placeholder — set to a real inbox you can confirm
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD for all Kivan resources (Project=kivan)"
  type        = string
  default     = "100.00"
}

variable "daily_budget_limit" {
  description = "Daily budget limit in USD; catches unexpected same-day cost spikes"
  type        = string
  default     = "10.00"
}

variable "clerk_secret_key" {
  description = "Clerk secret key (sk_...) — the backend uses it to fetch JWKS and user profiles"
  type        = string
  sensitive   = true
}

variable "firecrawl_api_key" {
  description = "Firecrawl API key (fc-...) for the backend's scrape proxy; it scrapes a browsed product page"
  type        = string
  sensitive   = true
}

variable "mailgun_api_key" {
  description = "Mailgun API key: the notification Lambda uses it to send email copies of notifications"
  type        = string
  sensitive   = true
  default     = "" # empty = email sending disabled
}

variable "mailgun_domain" {
  description = "Mailgun sending domain (e.g. mg.example.com or a sandbox domain). Not secret"
  type        = string
  default     = ""
}

variable "mailgun_from_email" {
  description = "From address for notification emails (e.g. notifications@mg.example.com). Not secret"
  type        = string
  default     = ""
}

