package services

import (
	"fmt"
	"strings"

	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

func CreateProduct(product *models.Product) error {

	tx, err := db.DB.Beginx()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	// Clean up input
	product.Name = strings.TrimSpace(product.Name)

	if product.Name == "" {
		return fmt.Errorf("product name is required")
	}

	if product.CategoryID <= 0 {
		return fmt.Errorf("category is required")
	}

	if product.Price < 0 {
		return fmt.Errorf("price cannot be negative")
	}

	if product.CostPrice != nil && *product.CostPrice < 0 {
		return fmt.Errorf("cost price cannot be negative")
	}

	if product.StockQuantity < 0 {
		return fmt.Errorf("stock quantity cannot be negative")
	}

	if product.SKU != nil {
		sku := strings.TrimSpace(*product.SKU)

		if sku == "" {
			product.SKU = nil
		} else {
			product.SKU = &sku
		}
	}

	err = product.Save(tx)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func GetProducts() ([]models.Product, error) {

	var products []models.Product

	query := `
		SELECT
			id,
			category_id,
			name,
			description,
			sku,
			price,
			cost_price,
			stock_quantity,
			is_active,
			created_at,
			updated_at
		FROM products
		ORDER BY id DESC
	`

	err := db.DB.Select(
		&products,
		query,
	)

	if err != nil {
		return nil, err
	}

	return products, nil
}

func GetProductByID(id int64) (*models.Product, error) {

	var product models.Product

	query := `
		SELECT
			id,
			category_id,
			name,
			description,
			sku,
			price,
			cost_price,
			stock_quantity,
			is_active,
			created_at,
			updated_at
		FROM products
		WHERE id = $1
	`

	err := db.DB.Get(
		&product,
		query,
		id,
	)

	if err != nil {
		return nil, err
	}

	return &product, nil
}

func UpdateProduct(product *models.Product) error {

	product.Name = strings.TrimSpace(product.Name)

	if product.Name == "" {
		return fmt.Errorf("product name is required")
	}

	if product.CategoryID <= 0 {
		return fmt.Errorf("category is required")
	}

	if product.Price < 0 {
		return fmt.Errorf("price cannot be negative")
	}

	if product.CostPrice != nil && *product.CostPrice < 0 {
		return fmt.Errorf("cost price cannot be negative")
	}

	if product.StockQuantity < 0 {
		return fmt.Errorf("stock quantity cannot be negative")
	}

	if product.SKU != nil {
		sku := strings.TrimSpace(*product.SKU)

		if sku == "" {
			product.SKU = nil
		} else {
			product.SKU = &sku
		}
	}

	tx, err := db.DB.Beginx()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	query := `
		UPDATE products
		SET
			category_id = $1,
			name = $2,
			description = $3,
			sku = $4,
			price = $5,
			cost_price = $6,
			stock_quantity = $7,
			is_active = $8,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $9
	`

	result, err := tx.Exec(
		query,
		product.CategoryID,
		product.Name,
		product.Description,
		product.SKU,
		product.Price,
		product.CostPrice,
		product.StockQuantity,
		product.IsActive,
		product.ID,
	)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("product not found")
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func DeleteProduct(id int64) error {

	tx, err := db.DB.Beginx()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	query := `
		DELETE FROM products
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
		return fmt.Errorf("product not found")
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
