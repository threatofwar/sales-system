package services

import (
	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

func CreateCompany(company *models.Company) error {

	tx, err := db.DB.Beginx()

	if err != nil {
		return err
	}

	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Insert company
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

	err = tx.QueryRowx(
		query,
		company.Name,
		company.RegistrationNo,
		company.Email,
		company.Phone,
		company.Address,
	).Scan(
		&company.ID,
		&company.CreatedAt,
		&company.UpdatedAt,
	)

	if err != nil {
		return err
	}

	return tx.Commit()
}

func GetCompanies() ([]models.Company, error) {

	var companies []models.Company

	query := `
		SELECT
			id,
			name,
			registration_no,
			email,
			phone,
			address,
			created_at,
			updated_at
		FROM companies
		ORDER BY id DESC
	`

	err := db.DB.Select(
		&companies,
		query,
	)

	if err != nil {
		return nil, err
	}

	return companies, nil
}

func GetCompanyByID(id int64) (*models.Company, error) {

	var company models.Company

	query := `
		SELECT
			id,
			name,
			registration_no,
			email,
			phone,
			address,
			created_at,
			updated_at
		FROM companies
		WHERE id = $1
	`

	err := db.DB.Get(
		&company,
		query,
		id,
	)

	if err != nil {
		return nil, err
	}

	return &company, nil
}

func UpdateCompany(company *models.Company) error {

	query := `
		UPDATE companies
		SET
			name = $1,
			registration_no = $2,
			email = $3,
			phone = $4,
			address = $5,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
	`

	_, err := db.DB.Exec(
		query,
		company.Name,
		company.RegistrationNo,
		company.Email,
		company.Phone,
		company.Address,
		company.ID,
	)

	return err
}

func DeleteCompany(id int64) error {

	query := `
		DELETE FROM companies
		WHERE id = $1
	`

	_, err := db.DB.Exec(
		query,
		id,
	)

	return err
}
