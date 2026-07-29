package services

import (
	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

func CreateCustomer(customer *models.Customer) error {

	tx, err := db.DB.Beginx()

	if err != nil {
		return err
	}

	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Insert customer
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

	err = tx.QueryRowx(
		query,
		customer.FirstName,
		customer.LastName,
		customer.Phone,
		customer.Address,
	).Scan(
		&customer.ID,
		&customer.CreatedAt,
		&customer.UpdatedAt,
	)

	if err != nil {
		return err
	}

	// Insert customer emails
	for _, email := range customer.Emails {

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
			customer.ID,
			email.Email,
			email.IsPrimary,
		).Scan(
			&email.ID,
			&email.CreatedAt,
		)

		if err != nil {
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
			first_name,
			last_name,
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
			first_name,
			last_name,
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

	query := `
		UPDATE customers
		SET
			first_name = $1,
			last_name = $2,
			phone = $3,
			address = $4,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`

	_, err := db.DB.Exec(
		query,
		customer.FirstName,
		customer.LastName,
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

	_, err := db.DB.Exec(
		query,
		id,
	)

	return err
}
