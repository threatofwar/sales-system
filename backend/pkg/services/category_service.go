package services

import (
	"fmt"
	"strings"

	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

func CreateCategory(category *models.Category) error {

	tx, err := db.DB.Beginx()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	category.Name = strings.TrimSpace(category.Name)

	if category.Name == "" {
		return fmt.Errorf("category name is required")
	}

	err = category.Save(tx)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func GetCategories() ([]models.Category, error) {

	var categories []models.Category

	query := `
		SELECT
			id,
			name,
			description,
			created_at,
			updated_at
		FROM categories
		ORDER BY id DESC
	`

	err := db.DB.Select(
		&categories,
		query,
	)

	if err != nil {
		return nil, err
	}

	return categories, nil
}

func GetCategoryByID(id int64) (*models.Category, error) {

	if id <= 0 {
		return nil, fmt.Errorf("invalid category id")
	}

	var category models.Category

	query := `
		SELECT
			id,
			name,
			description,
			created_at,
			updated_at
		FROM categories
		WHERE id = $1
	`

	err := db.DB.Get(
		&category,
		query,
		id,
	)

	if err != nil {
		return nil, err
	}

	return &category, nil
}

func UpdateCategory(category *models.Category) error {

	if category.ID <= 0 {
		return fmt.Errorf("invalid category id")
	}

	category.Name = strings.TrimSpace(category.Name)

	if category.Name == "" {
		return fmt.Errorf("category name is required")
	}

	tx, err := db.DB.Beginx()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	query := `
		UPDATE categories
		SET
			name = $1,
			description = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`

	result, err := tx.Exec(
		query,
		category.Name,
		category.Description,
		category.ID,
	)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("category not found")
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func DeleteCategory(id int64) error {

	if id <= 0 {
		return fmt.Errorf("invalid category id")
	}

	tx, err := db.DB.Beginx()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	query := `
		DELETE FROM categories
		WHERE id = $1
	`

	result, err := tx.Exec(
		query,
		id,
	)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("category not found")
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
