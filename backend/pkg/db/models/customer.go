package models

import (
	"fmt"
	"time"

	"go-login-restapi/pkg/db"

	"github.com/jmoiron/sqlx"
)

func stringPtr(s string) *string {
	return &s
}

type Customer struct {
	ID int64 `db:"id" json:"id"`

	Type        string `db:"type" json:"type"`
	DisplayName string `db:"display_name" json:"display_name"`

	FirstName *string `db:"first_name" json:"first_name"`
	LastName  *string `db:"last_name" json:"last_name"`

	CompanyName *string `db:"company_name" json:"company_name"`

	IdentificationNo *string `db:"identification_no" json:"identification_no"`
	RegistrationNo   *string `db:"registration_no" json:"registration_no"`

	Phone   string `db:"phone" json:"phone"`
	Address string `db:"address" json:"address"`

	Emails []CustomerEmail `json:"emails"`

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

	var firstName *string
	var lastName *string
	var companyName *string
	var identificationNo *string
	var registrationNo *string

	switch c.Type {

	case "PERSON":

		firstName = c.FirstName
		lastName = c.LastName
		identificationNo = c.IdentificationNo

	case "COMPANY":

		companyName = c.CompanyName
		registrationNo = c.RegistrationNo

	default:
		return fmt.Errorf("invalid customer type")
	}

	fmt.Println("DEBUG CUSTOMER SAVE")
	fmt.Println("Type:", c.Type)
	fmt.Println("DisplayName:", c.DisplayName)
	fmt.Println("FirstName:", c.FirstName)
	fmt.Println("CompanyName:", c.CompanyName)

	query := `
		INSERT INTO customers
		(
			type,
			display_name,

			first_name,
			last_name,

			company_name,

			identification_no,
			registration_no,

			phone,
			address
		)
		VALUES
		(
			$1,$2,
			$3,$4,
			$5,
			$6,$7,
			$8,$9
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,

		c.Type,
		c.DisplayName,

		firstName,
		lastName,

		companyName,

		identificationNo,
		registrationNo,

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
		Type:             "PERSON",
		DisplayName:      "Anwar Ibrahim",
		FirstName:        stringPtr("Anwar"),
		LastName:         stringPtr("Ibrahim"),
		IdentificationNo: stringPtr("920101-10-1234"),
		Phone:            "0123456789",
		Address:          "Kuala Lumpur",
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

func InsertTestCompany() {

	customer := Customer{
		Type:           "COMPANY",
		CompanyName:    stringPtr("Tech Solutions Sdn Bhd"),
		RegistrationNo: stringPtr("900101-10-1234"),
		Phone:          "0123456789",
		Address:        "Kuala Lumpur",
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
		Email:      "techsolutions@example.com",
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

	println("Test company inserted:", customer.CompanyName)
}
