package db

import (
	"log"
	"os"
	"path/filepath"
)

func RunMigrations() {

	files, err := filepath.Glob("migrations/*.sql")

	if err != nil {
		log.Fatal(err)
	}

	for _, file := range files {

		sqlBytes, err := os.ReadFile(file)

		if err != nil {
			log.Fatal(err)
		}

		_, err = DB.Exec(string(sqlBytes))

		if err != nil {
			log.Fatalf("Migration failed %s: %v", file, err)
		}

		log.Println("Executed migration:", file)
	}

	log.Println("All migrations completed")
}
