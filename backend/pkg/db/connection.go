package db

import (
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func InitDB() {

	var err error

	dsn := os.Getenv("DATABASE_URL")

	DB, err = sqlx.Connect("postgres", dsn)

	if err != nil {
		log.Fatal("Database connection failed:", err)
	}

	err = DB.Ping()

	if err != nil {
		log.Fatal("Database ping failed:", err)
	}

	log.Println("✅ Connected to Supabase PostgreSQL")
}
