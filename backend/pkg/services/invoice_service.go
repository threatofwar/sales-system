package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"

	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

// ============================================================
// Invoice List / Pagination Structures
// ============================================================

type InvoicePagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type InvoiceListResponse struct {
	Invoices   []models.Invoice  `json:"invoices"`
	Pagination InvoicePagination `json:"pagination"`
}

// InvoiceListOptions controls invoice list searching,
// filtering, sorting and pagination.
type InvoiceListOptions struct {
	Page int

	PageSize int

	Search string

	Status string

	SortBy string

	SortOrder string
}

// ============================================================
// Request / Response Structures
// ============================================================

// InvoiceItemInput represents an item being added to an invoice.
type InvoiceItemInput struct {
	ProductID int64  `json:"product_id"`
	Quantity  int    `json:"quantity"`
	UnitPrice string `json:"unit_price"`
	Discount  string `json:"discount,omitempty"`
}

// CreateInvoiceInput represents a complete invoice creation request.
type CreateInvoiceInput struct {
	CustomerID    int64              `json:"customer_id"`
	InvoiceNumber string             `json:"invoice_number"`
	InvoiceDate   *time.Time         `json:"invoice_date,omitempty"`
	DueDate       *time.Time         `json:"due_date,omitempty"`
	Status        string             `json:"status,omitempty"`
	Discount      string             `json:"discount,omitempty"`
	Tax           string             `json:"tax,omitempty"`
	Notes         *string            `json:"notes,omitempty"`
	Items         []InvoiceItemInput `json:"items"`
}

// UpdateInvoiceInput represents an invoice update request.
type UpdateInvoiceInput struct {
	CustomerID  int64              `json:"customer_id"`
	InvoiceDate *time.Time         `json:"invoice_date,omitempty"`
	DueDate     *time.Time         `json:"due_date,omitempty"`
	Status      string             `json:"status"`
	Discount    string             `json:"discount,omitempty"`
	Tax         string             `json:"tax,omitempty"`
	Notes       *string            `json:"notes,omitempty"`
	Items       []InvoiceItemInput `json:"items"`
}

// InvoiceWithItems represents an invoice together with its items.
type InvoiceWithItems struct {
	models.Invoice

	Items []InvoiceItemWithProduct `json:"items"`
}

// InvoiceItemWithProduct represents an invoice item
// together with its product name.
type InvoiceItemWithProduct struct {
	models.InvoiceItem

	ProductName string `db:"product_name" json:"product_name"`
}

// ============================================================
// Create Invoice
// ============================================================

func CreateInvoice(
	input *CreateInvoiceInput,
) (*InvoiceWithItems, error) {

	if input == nil {
		return nil, fmt.Errorf(
			"request body is required",
		)
	}

	// --------------------------------------------------------
	// Validate customer
	// --------------------------------------------------------

	if input.CustomerID <= 0 {
		return nil, fmt.Errorf(
			"customer id is required",
		)
	}

	// --------------------------------------------------------
	// Validate invoice number
	// --------------------------------------------------------

	input.InvoiceNumber =
		strings.TrimSpace(
			input.InvoiceNumber,
		)

	if input.InvoiceNumber == "" {
		return nil, fmt.Errorf(
			"invoice number is required",
		)
	}

	// --------------------------------------------------------
	// New invoices must start as DRAFT
	// --------------------------------------------------------

	status :=
		strings.ToUpper(
			strings.TrimSpace(
				input.Status,
			),
		)

	if status == "" {
		status = "DRAFT"
	}

	if status != "DRAFT" {
		return nil, fmt.Errorf(
			"new invoices must be created as DRAFT",
		)
	}

	// --------------------------------------------------------
	// Validate items
	// --------------------------------------------------------

	if len(input.Items) == 0 {
		return nil, fmt.Errorf(
			"invoice must contain at least one item",
		)
	}

	// --------------------------------------------------------
	// Parse invoice discount
	// --------------------------------------------------------

	discount, err :=
		parseMoney(
			input.Discount,
			"discount",
		)

	if err != nil {
		return nil, err
	}

	if discount.IsNegative() {
		return nil, fmt.Errorf(
			"discount cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Parse tax
	// --------------------------------------------------------

	tax, err :=
		parseMoney(
			input.Tax,
			"tax",
		)

	if err != nil {
		return nil, err
	}

	if tax.IsNegative() {
		return nil, fmt.Errorf(
			"tax cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Start transaction
	// --------------------------------------------------------

	tx, err :=
		db.DB.Beginx()

	if err != nil {
		return nil, err
	}

	defer tx.Rollback()

	// --------------------------------------------------------
	// Verify customer exists
	// --------------------------------------------------------

	var customerExists bool

	err = tx.Get(
		&customerExists,
		`
		SELECT EXISTS (
			SELECT 1
			FROM customers
			WHERE id = $1
		)
		`,
		input.CustomerID,
	)

	if err != nil {
		return nil, err
	}

	if !customerExists {
		return nil, fmt.Errorf(
			"customer not found",
		)
	}

	// --------------------------------------------------------
	// Invoice date
	// --------------------------------------------------------

	invoiceDate :=
		time.Now()

	if input.InvoiceDate != nil {
		invoiceDate =
			*input.InvoiceDate
	}

	// --------------------------------------------------------
	// Validate due date
	// --------------------------------------------------------

	if input.DueDate != nil &&
		input.DueDate.Before(
			invoiceDate,
		) {

		return nil, fmt.Errorf(
			"due date cannot be before invoice date",
		)
	}

	// --------------------------------------------------------
	// Build invoice items
	// --------------------------------------------------------

	subtotal :=
		decimal.Zero

	items :=
		make(
			[]models.InvoiceItem,
			0,
			len(input.Items),
		)

	for _, itemInput := range input.Items {

		if itemInput.ProductID <= 0 {
			return nil, fmt.Errorf(
				"product id is required",
			)
		}

		if itemInput.Quantity <= 0 {
			return nil, fmt.Errorf(
				"quantity must be greater than zero",
			)
		}

		var product struct {
			ID    int64  `db:"id"`
			Name  string `db:"name"`
			Price string `db:"price"`
		}

		err = tx.Get(
			&product,
			`
			SELECT
				id,
				name,
				price
			FROM products
			WHERE id = $1
			`,
			itemInput.ProductID,
		)

		if err != nil {
			return nil, fmt.Errorf(
				"product %d not found",
				itemInput.ProductID,
			)
		}

		// ----------------------------------------------------
		// Unit price
		// ----------------------------------------------------

		unitPriceString :=
			strings.TrimSpace(
				itemInput.UnitPrice,
			)

		if unitPriceString == "" {
			unitPriceString =
				product.Price
		}

		unitPrice, err :=
			parseMoney(
				unitPriceString,
				"unit price",
			)

		if err != nil {
			return nil, err
		}

		if unitPrice.IsNegative() {
			return nil, fmt.Errorf(
				"unit price cannot be negative",
			)
		}

		// ----------------------------------------------------
		// Item discount
		// ----------------------------------------------------

		itemDiscount, err :=
			parseMoney(
				itemInput.Discount,
				"item discount",
			)

		if err != nil {
			return nil, err
		}

		if itemDiscount.IsNegative() {
			return nil, fmt.Errorf(
				"item discount cannot be negative",
			)
		}

		itemSubtotal :=
			unitPrice.Mul(
				decimal.NewFromInt(
					int64(
						itemInput.Quantity,
					),
				),
			)

		if itemDiscount.GreaterThan(
			itemSubtotal,
		) {

			return nil, fmt.Errorf(
				"item discount cannot exceed item subtotal",
			)
		}

		itemTotal :=
			itemSubtotal.Sub(
				itemDiscount,
			)

		subtotal =
			subtotal.Add(
				itemTotal,
			)

		items =
			append(
				items,
				models.InvoiceItem{
					ProductID: itemInput.ProductID,

					Quantity: itemInput.Quantity,

					UnitPrice: unitPrice.StringFixed(2),

					Discount: itemDiscount.StringFixed(2),

					Total: itemTotal.StringFixed(2),
				},
			)
	}

	// --------------------------------------------------------
	// Final invoice total
	// --------------------------------------------------------

	total :=
		subtotal.
			Sub(discount).
			Add(tax)

	if total.IsNegative() {
		return nil, fmt.Errorf(
			"invoice total cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Save invoice
	// --------------------------------------------------------

	invoice :=
		&models.Invoice{
			CustomerID: input.CustomerID,

			InvoiceNumber: input.InvoiceNumber,

			InvoiceDate: invoiceDate,

			DueDate: input.DueDate,

			Status: status,

			Subtotal: subtotal.StringFixed(2),

			Discount: discount.StringFixed(2),

			Tax: tax.StringFixed(2),

			Total: total.StringFixed(2),

			Notes: input.Notes,
		}

	err =
		invoice.Save(tx)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Save invoice items
	// --------------------------------------------------------

	for index := range items {

		items[index].InvoiceID =
			invoice.ID

		err =
			items[index].Save(tx)

		if err != nil {
			return nil, err
		}
	}

	// --------------------------------------------------------
	// Commit
	// --------------------------------------------------------

	if err :=
		tx.Commit(); err != nil {

		return nil, err
	}

	return GetInvoiceByID(
		invoice.ID,
	)
}

// ============================================================
// Get All Invoices
//
// Supports:
//
// page
// page_size
// search
// status
// sort_by
// sort_order
// ============================================================

func GetInvoices(
	options InvoiceListOptions,
) (*InvoiceListResponse, error) {

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
	// Clean search
	// --------------------------------------------------------

	options.Search =
		strings.TrimSpace(
			options.Search,
		)

	// --------------------------------------------------------
	// Clean and validate status filter
	// --------------------------------------------------------

	options.Status =
		strings.ToUpper(
			strings.TrimSpace(
				options.Status,
			),
		)

	if options.Status != "" &&
		!isValidInvoiceFilterStatus(
			options.Status,
		) {

		return nil, fmt.Errorf(
			"invalid invoice status filter: %s",
			options.Status,
		)
	}

	// --------------------------------------------------------
	// Validate / normalise sorting
	// --------------------------------------------------------

	sortColumn, err :=
		getInvoiceSortColumn(
			options.SortBy,
		)

	if err != nil {
		return nil, err
	}

	sortOrder, err :=
		getInvoiceSortOrder(
			options.SortOrder,
		)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Build WHERE clause
	// --------------------------------------------------------

	whereClauses :=
		[]string{}

	args :=
		[]interface{}{}

	placeholder :=
		1

	// --------------------------------------------------------
	// Search:
	//
	// invoice number
	// customer display name
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
						i.invoice_number ILIKE %s
						OR
						COALESCE(c.display_name, '') ILIKE %s
					)
					`,
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
	// Status filter
	// --------------------------------------------------------

	if options.Status != "" {

		whereClauses =
			append(
				whereClauses,
				fmt.Sprintf(
					"i.status = $%d",
					placeholder,
				),
			)

		args =
			append(
				args,
				options.Status,
			)

		placeholder++
	}

	// --------------------------------------------------------
	// Final WHERE
	// --------------------------------------------------------

	whereSQL :=
		""

	if len(whereClauses) > 0 {

		whereSQL =
			"WHERE " +
				strings.Join(
					whereClauses,
					" AND ",
				)
	}

	// ========================================================
	// Count matching invoices
	//
	// IMPORTANT:
	// Pagination total must represent the FILTERED result,
	// not every invoice in the database.
	// ========================================================

	var total int64

	countQuery :=
		fmt.Sprintf(
			`
			SELECT COUNT(*)

			FROM invoices i

			LEFT JOIN customers c
				ON c.id = i.customer_id

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
			"failed to count invoices: %w",
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
	// Add pagination arguments
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
	// Retrieve filtered/sorted page
	// ========================================================

	var invoices []models.Invoice

	query :=
		fmt.Sprintf(
			`
			SELECT
				i.id,
				i.customer_id,

				COALESCE(
					NULLIF(
						TRIM(c.display_name),
						''
					),
					'-'
				) AS customer_name,

				i.invoice_number,
				i.invoice_date,
				i.due_date,
				i.status,
				i.subtotal,
				i.discount,
				i.tax,
				i.total,
				i.notes,
				i.created_at,
				i.updated_at

			FROM invoices i

			LEFT JOIN customers c
				ON c.id = i.customer_id

			%s

			ORDER BY
				%s %s,
				i.id DESC

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
			&invoices,
			query,
			queryArgs...,
		)

	if err != nil {

		return nil, fmt.Errorf(
			"failed to retrieve invoices: %w",
			err,
		)
	}

	if invoices == nil {

		invoices =
			[]models.Invoice{}
	}

	// --------------------------------------------------------
	// Calculate total pages
	// --------------------------------------------------------

	totalPages := 0

	if total > 0 {
		totalPages = int(
			(total + int64(options.PageSize) - 1) /
				int64(options.PageSize),
		)
	}

	// --------------------------------------------------------
	// Build response
	// --------------------------------------------------------

	return &InvoiceListResponse{

		Invoices: invoices,

		Pagination: InvoicePagination{

			Page: options.Page,

			PageSize: options.PageSize,

			Total: total,

			TotalPages: totalPages,
		},
	}, nil
}

// ============================================================
// Get Invoice By ID
// ============================================================

func GetInvoiceByID(
	id int64,
) (*InvoiceWithItems, error) {

	if id <= 0 {
		return nil, fmt.Errorf(
			"invalid invoice id",
		)
	}

	var invoice models.Invoice

	query := `
		SELECT
			i.id,
			i.customer_id,

			COALESCE(
				NULLIF(
					TRIM(c.display_name),
					''
				),
				'-'
			) AS customer_name,

			i.invoice_number,
			i.invoice_date,
			i.due_date,
			i.status,
			i.subtotal,
			i.discount,
			i.tax,
			i.total,
			i.notes,
			i.created_at,
			i.updated_at

		FROM invoices i

		LEFT JOIN customers c
			ON c.id = i.customer_id

		WHERE i.id = $1
	`

	err :=
		db.DB.Get(
			&invoice,
			query,
			id,
		)

	if err != nil {

		if err == sql.ErrNoRows {
			return nil, fmt.Errorf(
				"invoice not found",
			)
		}

		return nil, fmt.Errorf(
			"failed to retrieve invoice %d: %w",
			id,
			err,
		)
	}

	items, err :=
		getInvoiceItems(
			invoice.ID,
		)

	if err != nil {
		return nil, err
	}

	return &InvoiceWithItems{
		Invoice: invoice,

		Items: items,
	}, nil
}

// ============================================================
// Get Invoice Items
// ============================================================

func getInvoiceItems(
	invoiceID int64,
) ([]InvoiceItemWithProduct, error) {

	var items []InvoiceItemWithProduct

	query := `
		SELECT
			ii.id,
			ii.invoice_id,
			ii.product_id,
			ii.quantity,
			ii.unit_price,
			ii.discount,
			ii.total,
			p.name AS product_name

		FROM invoice_items ii

		INNER JOIN products p
			ON p.id = ii.product_id

		WHERE ii.invoice_id = $1

		ORDER BY ii.id ASC
	`

	err :=
		db.DB.Select(
			&items,
			query,
			invoiceID,
		)

	if err != nil {
		return nil, err
	}

	if items == nil {

		items =
			[]InvoiceItemWithProduct{}
	}

	return items, nil
}

// ============================================================
// Get Invoice Items Using Existing SQL Transaction
// ============================================================

func getInvoiceItemsWithTx(
	tx *sqlx.Tx,
	invoiceID int64,
) ([]models.InvoiceItem, error) {

	if tx == nil {
		return nil, fmt.Errorf(
			"database transaction is required",
		)
	}

	var items []models.InvoiceItem

	err :=
		tx.Select(
			&items,
			`
			SELECT
				id,
				invoice_id,
				product_id,
				quantity,
				unit_price,
				discount,
				total
			FROM invoice_items
			WHERE invoice_id = $1
			ORDER BY id ASC
			`,
			invoiceID,
		)

	if err != nil {
		return nil, err
	}

	if items == nil {

		items =
			[]models.InvoiceItem{}
	}

	return items, nil
}

// ============================================================
// Update Invoice
// ============================================================

func UpdateInvoice(
	id int64,
	input *UpdateInvoiceInput,
) (*InvoiceWithItems, error) {

	if id <= 0 {
		return nil, fmt.Errorf(
			"invalid invoice id",
		)
	}

	if input == nil {
		return nil, fmt.Errorf(
			"request body is required",
		)
	}

	// --------------------------------------------------------
	// Status is required for any update
	// --------------------------------------------------------

	status :=
		strings.ToUpper(
			strings.TrimSpace(
				input.Status,
			),
		)

	if status == "" {
		return nil, fmt.Errorf(
			"invoice status is required",
		)
	}

	if !isValidInvoiceStatus(
		status,
	) {

		return nil, fmt.Errorf(
			"invalid invoice status: %s",
			status,
		)
	}

	// --------------------------------------------------------
	// Start transaction
	// --------------------------------------------------------

	tx, err :=
		db.DB.Beginx()

	if err != nil {
		return nil, err
	}

	defer tx.Rollback()

	// --------------------------------------------------------
	// Load and lock existing invoice
	// --------------------------------------------------------

	var existingInvoice models.Invoice

	err =
		tx.Get(
			&existingInvoice,
			`
			SELECT
				id,
				customer_id,
				invoice_number,
				invoice_date,
				due_date,
				status,
				subtotal,
				discount,
				tax,
				total,
				notes,
				created_at,
				updated_at
			FROM invoices
			WHERE id = $1
			FOR UPDATE
			`,
			id,
		)

	if err != nil {

		if err == sql.ErrNoRows {
			return nil, fmt.Errorf(
				"invoice not found",
			)
		}

		return nil, fmt.Errorf(
			"failed to retrieve invoice %d: %w",
			id,
			err,
		)
	}

	existingStatus :=
		strings.ToUpper(
			strings.TrimSpace(
				existingInvoice.Status,
			),
		)

	// ========================================================
	// ISSUED invoice
	//
	// An issued invoice is read-only.
	// The ONLY allowed action is cancellation.
	// ========================================================

	if existingStatus == "ISSUED" {

		if status != "CANCELLED" {

			return nil, fmt.Errorf(
				"ISSUED invoice is locked and can only be cancelled",
			)
		}

		// ----------------------------------------------------
		// Read ORIGINAL saved invoice items
		// ----------------------------------------------------

		existingItems, err :=
			getInvoiceItemsWithTx(
				tx,
				id,
			)

		if err != nil {
			return nil, err
		}

		if len(existingItems) == 0 {
			return nil, fmt.Errorf(
				"invoice has no items",
			)
		}

		// ----------------------------------------------------
		// Restore stock using ORIGINAL quantities
		// ----------------------------------------------------

		err =
			restoreInvoiceStock(
				tx,
				id,
				existingItems,
			)

		if err != nil {

			return nil, fmt.Errorf(
				"failed to cancel invoice: %w",
				err,
			)
		}

		// ----------------------------------------------------
		// Change status only
		// ----------------------------------------------------

		_, err =
			tx.Exec(
				`
				UPDATE invoices
				SET
					status = 'CANCELLED',
					updated_at = CURRENT_TIMESTAMP
				WHERE id = $1
				`,
				id,
			)

		if err != nil {
			return nil, err
		}

		if err :=
			tx.Commit(); err != nil {

			return nil, err
		}

		return GetInvoiceByID(
			id,
		)
	}

	// ========================================================
	// Protected statuses
	// ========================================================

	if existingStatus == "PARTIAL" ||
		existingStatus == "PAID" ||
		existingStatus == "CANCELLED" {

		return nil, fmt.Errorf(
			"cannot update a %s invoice",
			existingStatus,
		)
	}

	// ========================================================
	// From this point onwards only DRAFT invoices are editable
	// ========================================================

	if existingStatus != "DRAFT" {

		return nil, fmt.Errorf(
			"unsupported invoice status: %s",
			existingStatus,
		)
	}

	// --------------------------------------------------------
	// DRAFT may remain DRAFT, become ISSUED,
	// or become CANCELLED.
	// --------------------------------------------------------

	if status != "DRAFT" &&
		status != "ISSUED" &&
		status != "CANCELLED" {

		return nil, fmt.Errorf(
			"cannot change invoice status from DRAFT to %s",
			status,
		)
	}

	// --------------------------------------------------------
	// Validate customer
	// --------------------------------------------------------

	if input.CustomerID <= 0 {
		return nil, fmt.Errorf(
			"customer id is required",
		)
	}

	// --------------------------------------------------------
	// Validate items
	// --------------------------------------------------------

	if len(input.Items) == 0 {
		return nil, fmt.Errorf(
			"invoice must contain at least one item",
		)
	}

	// --------------------------------------------------------
	// Validate customer exists
	// --------------------------------------------------------

	var customerExists bool

	err =
		tx.Get(
			&customerExists,
			`
			SELECT EXISTS (
				SELECT 1
				FROM customers
				WHERE id = $1
			)
			`,
			input.CustomerID,
		)

	if err != nil {
		return nil, err
	}

	if !customerExists {
		return nil, fmt.Errorf(
			"customer not found",
		)
	}

	// --------------------------------------------------------
	// Invoice date
	// --------------------------------------------------------

	invoiceDate :=
		existingInvoice.InvoiceDate

	if input.InvoiceDate != nil {
		invoiceDate =
			*input.InvoiceDate
	}

	// --------------------------------------------------------
	// Due date
	// --------------------------------------------------------

	dueDate :=
		existingInvoice.DueDate

	if input.DueDate != nil {
		dueDate =
			input.DueDate
	}

	if dueDate != nil &&
		dueDate.Before(
			invoiceDate,
		) {

		return nil, fmt.Errorf(
			"due date cannot be before invoice date",
		)
	}

	// --------------------------------------------------------
	// Invoice discount
	// --------------------------------------------------------

	discount, err :=
		parseMoney(
			input.Discount,
			"discount",
		)

	if err != nil {
		return nil, err
	}

	if discount.IsNegative() {
		return nil, fmt.Errorf(
			"discount cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Tax
	// --------------------------------------------------------

	tax, err :=
		parseMoney(
			input.Tax,
			"tax",
		)

	if err != nil {
		return nil, err
	}

	if tax.IsNegative() {
		return nil, fmt.Errorf(
			"tax cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Build updated invoice items
	// --------------------------------------------------------

	subtotal :=
		decimal.Zero

	items :=
		make(
			[]models.InvoiceItem,
			0,
			len(input.Items),
		)

	for _, itemInput := range input.Items {

		if itemInput.ProductID <= 0 {

			return nil, fmt.Errorf(
				"product id is required",
			)
		}

		if itemInput.Quantity <= 0 {

			return nil, fmt.Errorf(
				"quantity must be greater than zero",
			)
		}

		var product struct {
			ID    int64  `db:"id"`
			Name  string `db:"name"`
			Price string `db:"price"`
		}

		err =
			tx.Get(
				&product,
				`
				SELECT
					id,
					name,
					price
				FROM products
				WHERE id = $1
				`,
				itemInput.ProductID,
			)

		if err != nil {

			return nil, fmt.Errorf(
				"product %d not found",
				itemInput.ProductID,
			)
		}

		// ----------------------------------------------------
		// Unit price
		// ----------------------------------------------------

		unitPriceString :=
			strings.TrimSpace(
				itemInput.UnitPrice,
			)

		if unitPriceString == "" {

			unitPriceString =
				product.Price
		}

		unitPrice, err :=
			parseMoney(
				unitPriceString,
				"unit price",
			)

		if err != nil {
			return nil, err
		}

		if unitPrice.IsNegative() {

			return nil, fmt.Errorf(
				"unit price cannot be negative",
			)
		}

		// ----------------------------------------------------
		// Item discount
		// ----------------------------------------------------

		itemDiscount, err :=
			parseMoney(
				itemInput.Discount,
				"item discount",
			)

		if err != nil {
			return nil, err
		}

		if itemDiscount.IsNegative() {

			return nil, fmt.Errorf(
				"item discount cannot be negative",
			)
		}

		itemSubtotal :=
			unitPrice.Mul(
				decimal.NewFromInt(
					int64(
						itemInput.Quantity,
					),
				),
			)

		if itemDiscount.GreaterThan(
			itemSubtotal,
		) {

			return nil, fmt.Errorf(
				"item discount cannot exceed item subtotal",
			)
		}

		itemTotal :=
			itemSubtotal.Sub(
				itemDiscount,
			)

		subtotal =
			subtotal.Add(
				itemTotal,
			)

		items =
			append(
				items,
				models.InvoiceItem{
					InvoiceID: id,

					ProductID: itemInput.ProductID,

					Quantity: itemInput.Quantity,

					UnitPrice: unitPrice.StringFixed(2),

					Discount: itemDiscount.StringFixed(2),

					Total: itemTotal.StringFixed(2),
				},
			)
	}

	// --------------------------------------------------------
	// Final total
	// --------------------------------------------------------

	total :=
		subtotal.
			Sub(discount).
			Add(tax)

	if total.IsNegative() {

		return nil, fmt.Errorf(
			"invoice total cannot be negative",
		)
	}

	// --------------------------------------------------------
	// DRAFT -> ISSUED
	// --------------------------------------------------------

	if status == "ISSUED" {

		err =
			deductInvoiceStock(
				tx,
				id,
				items,
			)

		if err != nil {

			return nil, fmt.Errorf(
				"failed to issue invoice: %w",
				err,
			)
		}
	}

	// --------------------------------------------------------
	// Update invoice header
	// --------------------------------------------------------

	_, err =
		tx.Exec(
			`
			UPDATE invoices
			SET
				customer_id = $1,
				invoice_date = $2,
				due_date = $3,
				status = $4,
				subtotal = $5,
				discount = $6,
				tax = $7,
				total = $8,
				notes = $9,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $10
			`,
			input.CustomerID,
			invoiceDate,
			dueDate,
			status,
			subtotal.StringFixed(2),
			discount.StringFixed(2),
			tax.StringFixed(2),
			total.StringFixed(2),
			input.Notes,
			id,
		)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Replace items
	// --------------------------------------------------------

	_, err =
		tx.Exec(
			`
			DELETE FROM invoice_items
			WHERE invoice_id = $1
			`,
			id,
		)

	if err != nil {
		return nil, err
	}

	for index := range items {

		err =
			items[index].Save(tx)

		if err != nil {
			return nil, err
		}
	}

	// --------------------------------------------------------
	// Commit
	// --------------------------------------------------------

	if err :=
		tx.Commit(); err != nil {

		return nil, err
	}

	return GetInvoiceByID(
		id,
	)
}

// ============================================================
// Delete Invoice
// ============================================================

func DeleteInvoice(
	id int64,
) error {

	if id <= 0 {
		return fmt.Errorf(
			"invalid invoice id",
		)
	}

	tx, err :=
		db.DB.Beginx()

	if err != nil {
		return err
	}

	defer tx.Rollback()

	var status string

	err =
		tx.Get(
			&status,
			`
			SELECT status
			FROM invoices
			WHERE id = $1
			FOR UPDATE
			`,
			id,
		)

	if err != nil {

		if err == sql.ErrNoRows {
			return fmt.Errorf(
				"invoice not found",
			)
		}

		return err
	}

	status =
		strings.ToUpper(
			strings.TrimSpace(
				status,
			),
		)

	// --------------------------------------------------------
	// Only DRAFT invoices may be deleted.
	// --------------------------------------------------------

	if status != "DRAFT" {

		return fmt.Errorf(
			"only DRAFT invoices can be deleted",
		)
	}

	result, err :=
		tx.Exec(
			`
			DELETE FROM invoices
			WHERE id = $1
			`,
			id,
		)

	if err != nil {
		return err
	}

	rowsAffected, err :=
		result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf(
			"invoice not found",
		)
	}

	if err :=
		tx.Commit(); err != nil {

		return err
	}

	return nil
}

// ============================================================
// Helper: Validate Manually Requested Invoice Status
//
// PARTIAL and PAID are intentionally NOT included because
// payment_service.go controls those statuses.
// ============================================================

func isValidInvoiceStatus(
	status string,
) bool {

	switch status {

	case "DRAFT":
		return true

	case "ISSUED":
		return true

	case "CANCELLED":
		return true

	default:
		return false
	}
}

// ============================================================
// Helper: Validate Invoice Status Filter
//
// Searching/filtering must support every status, including
// PARTIAL and PAID.
// ============================================================

func isValidInvoiceFilterStatus(
	status string,
) bool {

	switch status {

	case "DRAFT":
		return true

	case "ISSUED":
		return true

	case "PARTIAL":
		return true

	case "PAID":
		return true

	case "CANCELLED":
		return true

	default:
		return false
	}
}

// ============================================================
// Helper: Safe Invoice Sort Column
//
// IMPORTANT:
// SQL column names cannot be parameterised using $1.
//
// Therefore we map accepted API values onto known SQL
// expressions instead of inserting raw user input.
// ============================================================

func getInvoiceSortColumn(
	sortBy string,
) (string, error) {

	sortBy =
		strings.ToLower(
			strings.TrimSpace(
				sortBy,
			),
		)

	if sortBy == "" {

		return "i.created_at", nil
	}

	switch sortBy {

	case "invoice_number":

		return "i.invoice_number", nil

	case "customer":

		return "c.display_name", nil

	case "invoice_date":

		return "i.invoice_date", nil

	case "due_date":

		return "i.due_date", nil

	case "status":

		return "i.status", nil

	case "total":

		return "i.total", nil

	case "created_at":

		return "i.created_at", nil

	default:

		return "", fmt.Errorf(
			"invalid sort_by value: %s",
			sortBy,
		)
	}
}

// ============================================================
// Helper: Safe Invoice Sort Direction
// ============================================================

func getInvoiceSortOrder(
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

// ============================================================
// Helper: Parse Money
// ============================================================

func parseMoney(
	value string,
	fieldName string,
) (decimal.Decimal, error) {

	value =
		strings.TrimSpace(
			value,
		)

	if value == "" {
		return decimal.Zero, nil
	}

	result, err :=
		decimal.NewFromString(
			value,
		)

	if err != nil {

		return decimal.Zero, fmt.Errorf(
			"invalid %s: %s",
			fieldName,
			value,
		)
	}

	if result.Exponent() < -2 {

		return decimal.Zero, fmt.Errorf(
			"%s cannot have more than 2 decimal places",
			fieldName,
		)
	}

	return result, nil
}
