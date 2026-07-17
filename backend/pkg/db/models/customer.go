package models

import (
	"time"

	"go-login-restapi/pkg/db"

	"github.com/jmoiron/sqlx"
)

type Customer struct {
	ID           int64           `db:"id" json:"id"`
	Name         string          `db:"name" json:"name"`
	Phone        string          `db:"phone" json:"phone"`
	Address      string          `db:"address" json:"address"`
	CustomerType string          `db:"customer_type" json:"customer_type"`
	Emails       []CustomerEmail `db:"emails" json:"emails"`
	CreatedAt    time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time       `db:"updated_at" json:"updated_at"`
}

type CustomerEmail struct {
	ID         int64  `db:"id" json:"id"`
	CustomerID int64  `db:"customer_id" json:"customer_id"`
	Email      string `db:"email" json:"email"`
	IsPrimary  bool   `db:"is_primary" json:"is_primary"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// Save inserts a new customer
func (c *Customer) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO customers
		(
			name,
			phone,
			address,
			customer_type
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4
		)
		RETURNING id, created_at, updated_at
	`

	return tx.QueryRowx(
		query,
		c.Name,
		c.Phone,
		c.Address,
		c.CustomerType,
	).Scan(
		&c.ID,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
}

// InsertTestCustomer creates sample data
func InsertTestCustomer() {

	customer := Customer{
		Name:         "Ahmad Cookie Shop",
		Phone:        "0123456789",
		Address:      "Kuala Lumpur",
		CustomerType: "RESELLER",
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

	// insert customer email
	email := CustomerEmail{
		CustomerID: customer.ID,
		Email:      "ahmad@example.com",
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
		RETURNING id, created_at
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

	println("Test customer inserted:", customer.Name)
}
