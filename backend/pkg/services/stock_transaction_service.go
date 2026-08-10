package services

import (
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"

	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

// ============================================================
// Create Stock Transaction
//
// Used by the normal/manual stock transaction endpoint.
//
// This method starts and commits its own database transaction.
// ============================================================

func CreateStockTransaction(
	transaction *models.StockTransaction,
) error {

	if transaction == nil {
		return fmt.Errorf(
			"stock transaction is required",
		)
	}

	tx, err := db.DB.Beginx()

	if err != nil {
		return err
	}

	defer tx.Rollback()

	err = createStockTransactionWithTx(
		tx,
		transaction,
	)

	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

// ============================================================
// Create Stock Transaction Using Existing Transaction
//
// Used internally when another service, such as the invoice
// service, already has an active SQL transaction.
//
// This prevents:
//
// invoice commits
// stock update fails
//
// or:
//
// stock commits
// invoice update fails
//
// Everything is committed or rolled back together.
// ============================================================

func createStockTransactionWithTx(
	tx *sqlx.Tx,
	transaction *models.StockTransaction,
) error {

	if tx == nil {
		return fmt.Errorf(
			"database transaction is required",
		)
	}

	if transaction == nil {
		return fmt.Errorf(
			"stock transaction is required",
		)
	}

	// --------------------------------------------------------
	// Validate product
	// --------------------------------------------------------

	if transaction.ProductID <= 0 {
		return fmt.Errorf(
			"product id is required",
		)
	}

	// --------------------------------------------------------
	// Normalise transaction type
	// --------------------------------------------------------

	transaction.TransactionType =
		strings.ToUpper(
			strings.TrimSpace(
				transaction.TransactionType,
			),
		)

	if transaction.TransactionType == "" {
		return fmt.Errorf(
			"transaction type is required",
		)
	}

	// --------------------------------------------------------
	// Validate quantity
	// --------------------------------------------------------

	if transaction.Quantity == 0 {
		return fmt.Errorf(
			"quantity cannot be zero",
		)
	}

	// STOCK_IN and STOCK_OUT are represented using
	// positive quantities.
	if transaction.TransactionType == "STOCK_IN" ||
		transaction.TransactionType == "STOCK_OUT" {

		if transaction.Quantity < 0 {

			return fmt.Errorf(
				"quantity must be positive for %s",
				transaction.TransactionType,
			)
		}
	}

	// --------------------------------------------------------
	// Validate transaction type
	// --------------------------------------------------------

	if transaction.TransactionType != "STOCK_IN" &&
		transaction.TransactionType != "STOCK_OUT" &&
		transaction.TransactionType != "ADJUSTMENT" {

		return fmt.Errorf(
			"invalid transaction type: %s",
			transaction.TransactionType,
		)
	}

	// --------------------------------------------------------
	// Get current product stock and lock product row
	// --------------------------------------------------------

	var currentStock int

	err := tx.Get(
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
			"product %d not found: %w",
			transaction.ProductID,
			err,
		)
	}

	// --------------------------------------------------------
	// Calculate stock movement
	// --------------------------------------------------------

	stockChange :=
		transaction.Quantity

	switch transaction.TransactionType {

	case "STOCK_IN":

		stockChange =
			transaction.Quantity

	case "STOCK_OUT":

		stockChange =
			-transaction.Quantity

	case "ADJUSTMENT":

		stockChange =
			transaction.Quantity
	}

	newStock :=
		currentStock + stockChange

	// --------------------------------------------------------
	// Prevent stock going below zero
	// --------------------------------------------------------

	if newStock < 0 {

		return fmt.Errorf(
			"insufficient stock for product %d: current stock is %d, requested quantity is %d",
			transaction.ProductID,
			currentStock,
			transaction.Quantity,
		)
	}

	// --------------------------------------------------------
	// Save stock transaction
	// --------------------------------------------------------

	err = transaction.Save(tx)

	if err != nil {
		return err
	}

	// --------------------------------------------------------
	// Update product stock
	// --------------------------------------------------------

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

	return nil
}

// ============================================================
// Check Whether Stock Has Already Been Deducted For Invoice
//
// Prevents an invoice from reducing stock more than once.
// ============================================================

func hasInvoiceStockTransaction(
	tx *sqlx.Tx,
	invoiceID int64,
) (bool, error) {

	if tx == nil {
		return false, fmt.Errorf(
			"database transaction is required",
		)
	}

	if invoiceID <= 0 {
		return false, fmt.Errorf(
			"invalid invoice id",
		)
	}

	var exists bool

	err := tx.Get(
		&exists,
		`
		SELECT EXISTS (
			SELECT 1
			FROM stock_transactions
			WHERE reference_type = 'INVOICE'
			  AND reference_id = $1
			  AND transaction_type = 'STOCK_OUT'
		)
		`,
		invoiceID,
	)

	if err != nil {
		return false, err
	}

	return exists, nil
}

// ============================================================
// Deduct Invoice Stock
//
// Creates one STOCK_OUT transaction for each invoice item.
// ============================================================

func deductInvoiceStock(
	tx *sqlx.Tx,
	invoiceID int64,
	items []models.InvoiceItem,
) error {

	if tx == nil {
		return fmt.Errorf(
			"database transaction is required",
		)
	}

	if invoiceID <= 0 {
		return fmt.Errorf(
			"invalid invoice id",
		)
	}

	if len(items) == 0 {
		return fmt.Errorf(
			"invoice has no items",
		)
	}

	// --------------------------------------------------------
	// Prevent duplicate stock deduction
	// --------------------------------------------------------

	alreadyDeducted, err :=
		hasInvoiceStockTransaction(
			tx,
			invoiceID,
		)

	if err != nil {
		return err
	}

	if alreadyDeducted {
		return nil
	}

	// --------------------------------------------------------
	// Build invoice stock transactions
	// --------------------------------------------------------

	referenceType :=
		"INVOICE"

	notes :=
		fmt.Sprintf(
			"Stock deducted for invoice %d",
			invoiceID,
		)

	for _, item := range items {

		referenceID :=
			invoiceID

		transaction :=
			&models.StockTransaction{

				ProductID: item.ProductID,

				TransactionType: "STOCK_OUT",

				Quantity: item.Quantity,

				ReferenceType: &referenceType,

				ReferenceID: &referenceID,

				Notes: &notes,
			}

		err =
			createStockTransactionWithTx(
				tx,
				transaction,
			)

		if err != nil {
			return err
		}
	}

	return nil
}

// ============================================================
// Check Whether Invoice Stock Has Already Been Restored
//
// Prevents stock from being returned multiple times for the
// same cancelled invoice.
// ============================================================

func hasInvoiceStockRestoration(
	tx *sqlx.Tx,
	invoiceID int64,
) (bool, error) {

	if tx == nil {
		return false, fmt.Errorf(
			"database transaction is required",
		)
	}

	if invoiceID <= 0 {
		return false, fmt.Errorf(
			"invalid invoice id",
		)
	}

	var exists bool

	err := tx.Get(
		&exists,
		`
		SELECT EXISTS (
			SELECT 1
			FROM stock_transactions
			WHERE reference_type = 'INVOICE_CANCEL'
			  AND reference_id = $1
			  AND transaction_type = 'STOCK_IN'
		)
		`,
		invoiceID,
	)

	if err != nil {
		return false, err
	}

	return exists, nil
}

// ============================================================
// Restore Stock For Cancelled Invoice
//
// Creates one STOCK_IN transaction for each invoice item.
// ============================================================

func restoreInvoiceStock(
	tx *sqlx.Tx,
	invoiceID int64,
	items []models.InvoiceItem,
) error {

	if tx == nil {
		return fmt.Errorf(
			"database transaction is required",
		)
	}

	if invoiceID <= 0 {
		return fmt.Errorf(
			"invalid invoice id",
		)
	}

	if len(items) == 0 {
		return fmt.Errorf(
			"invoice has no items",
		)
	}

	// --------------------------------------------------------
	// Ensure stock was originally deducted
	// --------------------------------------------------------

	wasDeducted, err :=
		hasInvoiceStockTransaction(
			tx,
			invoiceID,
		)

	if err != nil {
		return err
	}

	if !wasDeducted {

		/*
		 * This can happen when a DRAFT invoice is cancelled.
		 *
		 * No stock was deducted, so nothing should be restored.
		 */
		return nil
	}

	// --------------------------------------------------------
	// Prevent duplicate restoration
	// --------------------------------------------------------

	alreadyRestored, err :=
		hasInvoiceStockRestoration(
			tx,
			invoiceID,
		)

	if err != nil {
		return err
	}

	if alreadyRestored {
		return nil
	}

	// --------------------------------------------------------
	// Restore each invoice item
	// --------------------------------------------------------

	referenceType :=
		"INVOICE_CANCEL"

	notes :=
		fmt.Sprintf(
			"Stock restored for cancelled invoice %d",
			invoiceID,
		)

	for _, item := range items {

		referenceID :=
			invoiceID

		transaction :=
			&models.StockTransaction{

				ProductID: item.ProductID,

				TransactionType: "STOCK_IN",

				Quantity: item.Quantity,

				ReferenceType: &referenceType,

				ReferenceID: &referenceID,

				Notes: &notes,
			}

		err =
			createStockTransactionWithTx(
				tx,
				transaction,
			)

		if err != nil {
			return err
		}
	}

	return nil
}

// ============================================================
// Get All Stock Transactions
// ============================================================

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

	if transactions == nil {

		transactions =
			[]models.StockTransactionWithProduct{}
	}

	return transactions, nil
}

// ============================================================
// Get Stock Transaction By ID
// ============================================================

func GetStockTransactionByID(
	id int64,
) (*models.StockTransactionWithProduct, error) {

	if id <= 0 {
		return nil, fmt.Errorf(
			"invalid stock transaction id",
		)
	}

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
