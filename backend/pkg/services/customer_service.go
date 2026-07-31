package services

import (
	"fmt"
	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
	"strings"
)

func CreateCustomer(customer *models.Customer) error {

	tx, err := db.DB.Beginx()

	if err != nil {
		return err
	}

	err = populateDisplayName(customer)

	if err != nil {
		tx.Rollback()
		return err
	}

	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

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
			$1,
			$2,

			$3,
			$4,

			$5,

			$6,
			$7,

			$8,
			$9
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	err = tx.QueryRowx(
		query,

		customer.Type,
		customer.DisplayName,

		customer.FirstName,
		customer.LastName,

		customer.CompanyName,

		customer.IdentificationNo,
		customer.RegistrationNo,

		customer.Phone,
		customer.Address,
	).Scan(
		&customer.ID,
		&customer.CreatedAt,
		&customer.UpdatedAt,
	)

	if err != nil {
		tx.Rollback()
		return err
	}

	// Insert customer emails
	for i := range customer.Emails {

		customer.Emails[i].CustomerID = customer.ID

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

			customer.Emails[i].CustomerID,
			customer.Emails[i].Email,
			customer.Emails[i].IsPrimary,
		).Scan(
			&customer.Emails[i].ID,
			&customer.Emails[i].CreatedAt,
		)

		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func GetCustomers() ([]models.Customer, error) {

	var customers []models.Customer

	query := `
		SELECT
			id,
			type,
			display_name,

			first_name,
			last_name,

			company_name,

			identification_no,
			registration_no,

			phone,
			address,

			created_at,
			updated_at
		FROM customers
		ORDER BY id DESC
	`

	err := db.DB.Select(
		&customers,
		query,
	)

	if err != nil {
		return nil, err
	}

	for i := range customers {

		emails, err := GetCustomerEmails(customers[i].ID)

		if err != nil {
			return nil, err
		}

		customers[i].Emails = emails
	}

	return customers, nil
}

func GetCustomerByID(id int64) (*models.Customer, error) {

	var customer models.Customer

	query := `
		SELECT
			id,
			type,
			display_name,

			first_name,
			last_name,

			company_name,

			identification_no,
			registration_no,

			phone,
			address,

			created_at,
			updated_at
		FROM customers
		WHERE id = $1
	`

	err := db.DB.Get(
		&customer,
		query,
		id,
	)

	if err != nil {
		return nil, err
	}

	customer.Emails, err = GetCustomerEmails(customer.ID)

	if err != nil {
		return nil, err
	}

	return &customer, nil
}

func GetCustomerEmails(customerID int64) ([]models.CustomerEmail, error) {

	var emails []models.CustomerEmail

	query := `
		SELECT
			id,
			customer_id,
			email,
			is_primary,
			created_at
		FROM customer_emails
		WHERE customer_id = $1
		ORDER BY is_primary DESC, id
	`

	err := db.DB.Select(
		&emails,
		query,
		customerID,
	)

	return emails, err
}

func UpdateCustomer(customer *models.Customer) error {

	// Automatically populate DisplayName
	err := populateDisplayName(customer)
	if err != nil {
		return err
	}

	query := `
		UPDATE customers
		SET
			type = $1,
			display_name = $2,

			first_name = $3,
			last_name = $4,

			company_name = $5,

			identification_no = $6,
			registration_no = $7,

			phone = $8,
			address = $9,

			updated_at = CURRENT_TIMESTAMP

		WHERE id = $10
	`

	_, err = db.DB.Exec(
		query,

		customer.Type,
		customer.DisplayName,

		customer.FirstName,
		customer.LastName,

		customer.CompanyName,

		customer.IdentificationNo,
		customer.RegistrationNo,

		customer.Phone,
		customer.Address,

		customer.ID,
	)

	return err
}

func DeleteCustomer(id int64) error {

	query := `
		DELETE FROM customers
		WHERE id = $1
	`

	result, err := db.DB.Exec(query, id)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("customer not found")
	}

	return nil
}

func populateDisplayName(customer *models.Customer) error {

	switch customer.Type {

	case "PERSON":

		if customer.FirstName == nil || customer.LastName == nil {
			return fmt.Errorf("first name and last name are required")
		}

		customer.DisplayName = strings.TrimSpace(
			*customer.FirstName + " " + *customer.LastName,
		)

	case "COMPANY":

		if customer.CompanyName == nil {
			return fmt.Errorf("company name is required")
		}

		customer.DisplayName = strings.TrimSpace(
			*customer.CompanyName,
		)

	default:
		return fmt.Errorf("invalid customer type")
	}

	return nil
}
