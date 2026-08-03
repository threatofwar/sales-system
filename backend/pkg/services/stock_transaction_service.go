package services

import (
	"fmt"
	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
	"strings"
)

func CreateStockTransaction(
	transaction *models.StockTransaction,
) error {

	// ==========================================
	// Basic validation
	// ==========================================

	if transaction.ProductID <= 0 {
		return fmt.Errorf("product id is required")
	}

	transaction.TransactionType =
		strings.ToUpper(
			strings.TrimSpace(
				transaction.TransactionType,
			),
		)

	if transaction.TransactionType == "" {
		return fmt.Errorf("transaction type is required")
	}

	if transaction.Quantity == 0 {
		return fmt.Errorf("quantity cannot be zero")
	}

	// STOCK_IN and STOCK_OUT require positive
	// quantities.
	if transaction.TransactionType == "STOCK_IN" ||
		transaction.TransactionType == "STOCK_OUT" {

		if transaction.Quantity < 0 {
			return fmt.Errorf(
				"quantity must be positive for %s",
				transaction.TransactionType,
			)
		}
	}

	// Only these transaction types are allowed.
	if transaction.TransactionType != "STOCK_IN" &&
		transaction.TransactionType != "STOCK_OUT" &&
		transaction.TransactionType != "ADJUSTMENT" {

		return fmt.Errorf(
			"invalid transaction type: %s",
			transaction.TransactionType,
		)
	}

	// ==========================================
	// Begin transaction
	// ==========================================

	tx, err := db.DB.Beginx()

	if err != nil {
		return err
	}

	defer tx.Rollback()

	// ==========================================
	// Get current stock
	// ==========================================

	var currentStock int

	err = tx.Get(
		&currentStock,
		`
		SELECT stock_quantity
		FROM products
		WHERE id = $1
		FOR UPDATE
		`,
		transaction.ProductID,
	)

	if err != nil {
		return fmt.Errorf(
			"product not found: %w",
			err,
		)
	}

	// ==========================================
	// Calculate stock change
	// ==========================================

	stockChange := transaction.Quantity

	switch transaction.TransactionType {

	case "STOCK_IN":
		stockChange = transaction.Quantity

	case "STOCK_OUT":
		stockChange = -transaction.Quantity

	case "ADJUSTMENT":
		stockChange = transaction.Quantity
	}

	newStock := currentStock + stockChange

	// ==========================================
	// Prevent negative stock
	// ==========================================

	if newStock < 0 {

		return fmt.Errorf(
			"insufficient stock: current stock is %d",
			currentStock,
		)
	}

	// ==========================================
	// Insert transaction
	// ==========================================

	err = transaction.Save(tx)

	if err != nil {
		return err
	}

	// ==========================================
	// Update product stock
	// ==========================================

	_, err = tx.Exec(
		`
		UPDATE products
		SET
			stock_quantity = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		`,
		newStock,
		transaction.ProductID,
	)

	if err != nil {
		return err
	}

	// ==========================================
	// Commit
	// ==========================================

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

// ==========================================
// Get all stock transactions
// ==========================================

func GetStockTransactions() (
	[]models.StockTransactionWithProduct,
	error,
) {

	var transactions []models.StockTransactionWithProduct

	query := `
		SELECT
			st.id,
			st.product_id,
			p.name AS product_name,
			st.transaction_type,
			st.quantity,
			st.reference_type,
			st.reference_id,
			st.notes,
			st.created_at
		FROM stock_transactions st
		INNER JOIN products p
			ON p.id = st.product_id
		ORDER BY st.id DESC
	`

	err := db.DB.Select(
		&transactions,
		query,
	)

	if err != nil {
		return nil, err
	}

	return transactions, nil
}

// ==========================================
// Get stock transaction by ID
// ==========================================

func GetStockTransactionByID(
	id int64,
) (*models.StockTransactionWithProduct, error) {

	var transaction models.StockTransactionWithProduct

	query := `
		SELECT
			st.id,
			st.product_id,
			p.name AS product_name,
			st.transaction_type,
			st.quantity,
			st.reference_type,
			st.reference_id,
			st.notes,
			st.created_at
		FROM stock_transactions st
		INNER JOIN products p
			ON p.id = st.product_id
		WHERE st.id = $1
	`

	err := db.DB.Get(
		&transaction,
		query,
		id,
	)

	if err != nil {
		return nil, err
	}

	return &transaction, nil
}
