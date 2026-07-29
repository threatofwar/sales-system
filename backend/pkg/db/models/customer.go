package models

import (
	"time"

	"go-login-restapi/pkg/db"

	"github.com/jmoiron/sqlx"
)

type Customer struct {
	ID        int64           `db:"id" json:"id"`
	FirstName string          `db:"first_name" json:"first_name"`
	LastName  string          `db:"last_name" json:"last_name"`
	Phone     string          `db:"phone" json:"phone"`
	Address   string          `db:"address" json:"address"`
	Emails    []CustomerEmail `json:"emails"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type CustomerEmail struct {
	ID         int64     `db:"id" json:"id"`
	CustomerID int64     `db:"customer_id" json:"customer_id"`
	Email      string    `db:"email" json:"email"`
	IsPrimary  bool      `db:"is_primary" json:"is_primary"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

// Save inserts a new customer
func (c *Customer) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO customers
		(
			first_name,
			last_name,
			phone,
			address
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,
		c.FirstName,
		c.LastName,
		c.Phone,
		c.Address,
	).Scan(
		&c.ID,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
}

// InsertTestCustomer creates sample data
func InsertTestCustomer() {

	customer := Customer{
		FirstName: "Ahmad",
		LastName:  "Yaacob",
		Phone:     "0123456789",
		Address:   "Kuala Lumpur",
	}

	tx, err := db.DB.Beginx()
	if err != nil {
		panic(err)
	}

	err = customer.Save(tx)
	if err != nil {
		tx.Rollback()
		panic(err)
	}

	// Primary email
	email := CustomerEmail{
		CustomerID: customer.ID,
		Email:      "ahmads@example.com",
		IsPrimary:  true,
	}

	emailQuery := `
		INSERT INTO customer_emails
		(
			customer_id,
			email,
			is_primary
		)
		VALUES
		(
			$1,
			$2,
			$3
		)
		RETURNING
			id,
			created_at
	`

	err = tx.QueryRowx(
		emailQuery,
		email.CustomerID,
		email.Email,
		email.IsPrimary,
	).Scan(
		&email.ID,
		&email.CreatedAt,
	)

	if err != nil {
		tx.Rollback()
		panic(err)
	}

	err = tx.Commit()
	if err != nil {
		panic(err)
	}

	println("Test customer inserted:", customer.FirstName, customer.LastName)
}
