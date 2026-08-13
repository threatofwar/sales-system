package services

import (
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"

	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

// ============================================================
// Stock Transaction List / Pagination Structures
// ============================================================

type StockTransactionPagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type StockTransactionListResponse struct {
	Transactions []models.StockTransactionWithProduct `json:"transactions"`
	Pagination   StockTransactionPagination           `json:"pagination"`
}

type StockTransactionListOptions struct {
	Page int

	PageSize int

	Search string

	TransactionType string

	SortBy string

	SortOrder string
}

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

	if !isValidStockTransactionType(
		transaction.TransactionType,
	) {

		return fmt.Errorf(
			"invalid transaction type: %s",
			transaction.TransactionType,
		)
	}

	// --------------------------------------------------------
	// Get current product stock and lock row
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
	// Prevent negative stock
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
	// Save transaction
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
		 * A DRAFT invoice may be cancelled.
		 *
		 * No stock was deducted, therefore nothing
		 * needs to be restored.
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
// Get Stock Transactions
//
// Supports:
//
// page
// page_size
// search
// transaction_type
// sort_by
// sort_order
//
// Search checks:
//
// product name
// notes
// reference type
// ============================================================

func GetStockTransactions(
	options StockTransactionListOptions,
) (*StockTransactionListResponse, error) {

	// --------------------------------------------------------
	// Safe pagination defaults
	// --------------------------------------------------------

	if options.Page <= 0 {
		options.Page = 1
	}

	if options.PageSize <= 0 {
		options.PageSize = 20
	}

	if options.PageSize > 100 {
		options.PageSize = 100
	}

	// --------------------------------------------------------
	// Search
	// --------------------------------------------------------

	options.Search =
		strings.TrimSpace(
			options.Search,
		)

	// --------------------------------------------------------
	// Transaction type filter
	// --------------------------------------------------------

	options.TransactionType =
		strings.ToUpper(
			strings.TrimSpace(
				options.TransactionType,
			),
		)

	if options.TransactionType != "" &&
		!isValidStockTransactionType(
			options.TransactionType,
		) {

		return nil, fmt.Errorf(
			"invalid transaction type filter: %s",
			options.TransactionType,
		)
	}

	// --------------------------------------------------------
	// Sorting
	// --------------------------------------------------------

	sortColumn, err :=
		getStockTransactionSortColumn(
			options.SortBy,
		)

	if err != nil {
		return nil, err
	}

	sortOrder, err :=
		getStockTransactionSortOrder(
			options.SortOrder,
		)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Build WHERE
	// --------------------------------------------------------

	whereClauses :=
		[]string{}

	args :=
		[]interface{}{}

	placeholder :=
		1

	// --------------------------------------------------------
	// Search
	// --------------------------------------------------------

	if options.Search != "" {

		searchPlaceholder :=
			fmt.Sprintf(
				"$%d",
				placeholder,
			)

		whereClauses =
			append(
				whereClauses,
				fmt.Sprintf(
					`
					(
						p.name ILIKE %s
						OR
						COALESCE(st.notes, '') ILIKE %s
						OR
						COALESCE(st.reference_type, '') ILIKE %s
					)
					`,
					searchPlaceholder,
					searchPlaceholder,
					searchPlaceholder,
				),
			)

		args =
			append(
				args,
				"%"+options.Search+"%",
			)

		placeholder++
	}

	// --------------------------------------------------------
	// Transaction type
	// --------------------------------------------------------

	if options.TransactionType != "" {

		whereClauses =
			append(
				whereClauses,
				fmt.Sprintf(
					"st.transaction_type = $%d",
					placeholder,
				),
			)

		args =
			append(
				args,
				options.TransactionType,
			)

		placeholder++
	}

	// --------------------------------------------------------
	// Final WHERE
	// --------------------------------------------------------

	whereSQL := ""

	if len(whereClauses) > 0 {

		whereSQL =
			"WHERE " +
				strings.Join(
					whereClauses,
					" AND ",
				)
	}

	// ========================================================
	// Count matching transactions
	// ========================================================

	var total int64

	countQuery :=
		fmt.Sprintf(
			`
			SELECT COUNT(*)

			FROM stock_transactions st

			INNER JOIN products p
				ON p.id = st.product_id

			%s
			`,
			whereSQL,
		)

	err =
		db.DB.Get(
			&total,
			countQuery,
			args...,
		)

	if err != nil {

		return nil, fmt.Errorf(
			"failed to count stock transactions: %w",
			err,
		)
	}

	// --------------------------------------------------------
	// Calculate offset
	// --------------------------------------------------------

	offset :=
		(options.Page - 1) *
			options.PageSize

	// --------------------------------------------------------
	// Pagination placeholders
	// --------------------------------------------------------

	limitPlaceholder :=
		placeholder

	offsetPlaceholder :=
		placeholder + 1

	queryArgs :=
		append(
			[]interface{}{},
			args...,
		)

	queryArgs =
		append(
			queryArgs,
			options.PageSize,
			offset,
		)

	// ========================================================
	// Retrieve page
	// ========================================================

	var transactions []models.StockTransactionWithProduct

	query :=
		fmt.Sprintf(
			`
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

			%s

			ORDER BY
				%s %s,
				st.id DESC

			LIMIT $%d
			OFFSET $%d
			`,
			whereSQL,
			sortColumn,
			sortOrder,
			limitPlaceholder,
			offsetPlaceholder,
		)

	err =
		db.DB.Select(
			&transactions,
			query,
			queryArgs...,
		)

	if err != nil {

		return nil, fmt.Errorf(
			"failed to retrieve stock transactions: %w",
			err,
		)
	}

	if transactions == nil {

		transactions =
			[]models.StockTransactionWithProduct{}
	}

	// --------------------------------------------------------
	// Calculate pages
	// --------------------------------------------------------

	totalPages := 0

	if total > 0 {

		totalPages = int(
			(total + int64(options.PageSize) - 1) /
				int64(options.PageSize),
		)
	}

	return &StockTransactionListResponse{
		Transactions: transactions,

		Pagination: StockTransactionPagination{
			Page: options.Page,

			PageSize: options.PageSize,

			Total: total,

			TotalPages: totalPages,
		},
	}, nil
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

// ============================================================
// Helper: Validate Stock Transaction Type
// ============================================================

func isValidStockTransactionType(
	transactionType string,
) bool {

	switch transactionType {

	case "STOCK_IN":
		return true

	case "STOCK_OUT":
		return true

	case "ADJUSTMENT":
		return true

	default:
		return false
	}
}

// ============================================================
// Helper: Safe Stock Transaction Sort Column
// ============================================================

func getStockTransactionSortColumn(
	sortBy string,
) (string, error) {

	sortBy =
		strings.ToLower(
			strings.TrimSpace(
				sortBy,
			),
		)

	if sortBy == "" {
		return "st.created_at", nil
	}

	switch sortBy {

	case "created_at":

		return "st.created_at", nil

	case "product":

		return "p.name", nil

	case "transaction_type":

		return "st.transaction_type", nil

	case "quantity":

		return "st.quantity", nil

	case "reference_type":

		return "st.reference_type", nil

	case "reference_id":

		return "st.reference_id", nil

	default:

		return "", fmt.Errorf(
			"invalid sort_by value: %s",
			sortBy,
		)
	}
}

// ============================================================
// Helper: Safe Stock Transaction Sort Order
// ============================================================

func getStockTransactionSortOrder(
	sortOrder string,
) (string, error) {

	sortOrder =
		strings.ToLower(
			strings.TrimSpace(
				sortOrder,
			),
		)

	if sortOrder == "" {
		return "DESC", nil
	}

	switch sortOrder {

	case "asc":

		return "ASC", nil

	case "desc":

		return "DESC", nil

	default:

		return "", fmt.Errorf(
			"sort_order must be asc or desc",
		)
	}
}
