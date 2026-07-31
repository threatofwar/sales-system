package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type Company struct {
	ID             int64  `db:"id" json:"id"`
	Name           string `db:"name" json:"name"`
	RegistrationNo string `db:"registration_no" json:"registration_no"`
	Email          string `db:"email" json:"email"`
	Phone          string `db:"phone" json:"phone"`
	Address        string `db:"address" json:"address"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Save inserts a new company
func (c *Company) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO companies
		(
			name,
			registration_no,
			email,
			phone,
			address
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4,
			$5
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,
		c.Name,
		c.RegistrationNo,
		c.Email,
		c.Phone,
		c.Address,
	).Scan(
		&c.ID,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
}

// InsertTestCompany creates sample data
// func InsertTestCompany() {

// 	company := Company{
// 		Name:           "Test Company",
// 		RegistrationNo: "123456789",
// 		Email:          "info@testcompany.com",
// 		Phone:          "0123456789",
// 		Address:        "Kuala Lumpur",
// 	}

// 	tx, err := db.DB.Beginx()
// 	if err != nil {
// 		panic(err)
// 	}

// 	err = company.Save(tx)
// 	if err != nil {
// 		tx.Rollback()
// 		panic(err)
// 	}

// 	err = tx.Commit()
// 	if err != nil {
// 		panic(err)
// 	}

// 	println("Test company inserted:", company.Name)
// }
