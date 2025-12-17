// Atlas configuration file
// https://atlasgo.io/atlas-schema/hcl

variable "database_url" {
  type    = string
  default = getenv("DATABASE_URL")
}

env "local" {
  url = "postgres://postgres:postgres@db.localtest.me:5434/main?search_path=public&sslmode=disable"
  src = "file://atlas/schema.sql"
}

env "test" {
  url = "postgres://postgres:postgres@db.localtest.me:5435/main?search_path=public&sslmode=disable"
  src = "file://atlas/schema.sql"
}

env "production" {
  url = "${var.database_url}&search_path=public"
  src = "file://atlas/schema.sql"
}
