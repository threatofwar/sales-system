package db

import (
	"log"
)

func CreateTables() {
	CreateUserTable()
	CreateEmailsTable()
	CreateCustomerTable()
	log.Println("All tables have been created or already exist.")
}

func CreateUserTable() {
	_, err := DB.Exec(`CREATE TABLE IF NOT EXISTS users (
		id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
		username TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		password_reset_token TEXT,
		password_reset_token_used BOOLEAN DEFAULT FALSE
	)`)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("User table created or already exists.")
}

func CreateEmailsTable() {
	_, err := DB.Exec(`CREATE TABLE IF NOT EXISTS emails (
		id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
		user_id INTEGER NOT NULL,
		email TEXT NOT NULL UNIQUE,
		verified BOOLEAN DEFAULT FALSE,
		verification_token TEXT,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Emails table created or already exists.")
}

func CreateCustomerTable() {
	_, err := DB.Exec(`CREATE TABLE IF NOT EXISTS customers (
		id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

		name TEXT NOT NULL,
		phone TEXT,
		email TEXT,

		address TEXT,

		customer_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',

		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Customer table created or already exists.")
}

func CreateCustomerCompanyTable() {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS customer_companies (
			id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

			customer_id BIGINT NOT NULL,

			company_name TEXT NOT NULL,
			registration_no TEXT,
			email TEXT,
			phone TEXT,
			address TEXT,

			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

			CONSTRAINT customer_companies_customer_id_fkey
				FOREIGN KEY (customer_id)
				REFERENCES customers(id)
				ON DELETE CASCADE
		)
	`)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Customer company table created or already exists.")
}
