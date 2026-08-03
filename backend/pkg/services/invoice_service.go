package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
)

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

// InvoiceItemWithProduct represents an invoice item with product information.
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

	// --------------------------------------------------------
	// Validate input
	// --------------------------------------------------------

	if input == nil {
		return nil, fmt.Errorf("request body is required")
	}

	// --------------------------------------------------------
	// Validate customer
	// --------------------------------------------------------

	if input.CustomerID <= 0 {
		return nil, fmt.Errorf("customer id is required")
	}

	// --------------------------------------------------------
	// Validate invoice number
	// --------------------------------------------------------

	input.InvoiceNumber = strings.TrimSpace(
		input.InvoiceNumber,
	)

	if input.InvoiceNumber == "" {
		return nil, fmt.Errorf(
			"invoice number is required",
		)
	}

	// --------------------------------------------------------
	// Validate status
	// --------------------------------------------------------

	status := strings.ToUpper(
		strings.TrimSpace(input.Status),
	)

	if status == "" {
		status = "DRAFT"
	}

	if !isValidInvoiceStatus(status) {
		return nil, fmt.Errorf(
			"invalid invoice status: %s",
			status,
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
	// Parse invoice-level discount
	// --------------------------------------------------------

	discount, err := parseMoney(
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
	// Parse invoice-level tax
	// --------------------------------------------------------

	tax, err := parseMoney(
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

	tx, err := db.DB.Beginx()

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
	// Determine invoice date
	// --------------------------------------------------------

	invoiceDate := time.Now()

	if input.InvoiceDate != nil {
		invoiceDate = *input.InvoiceDate
	}

	// --------------------------------------------------------
	// Validate due date
	// --------------------------------------------------------

	if input.DueDate != nil &&
		input.DueDate.Before(invoiceDate) {

		return nil, fmt.Errorf(
			"due date cannot be before invoice date",
		)
	}

	// --------------------------------------------------------
	// Calculate subtotal
	// --------------------------------------------------------

	subtotal := decimal.Zero

	items := make(
		[]models.InvoiceItem,
		0,
		len(input.Items),
	)

	// --------------------------------------------------------
	// Process invoice items
	// --------------------------------------------------------

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

		// ----------------------------------------------------
		// Get product
		// ----------------------------------------------------

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
		// Determine unit price
		// ----------------------------------------------------

		unitPriceString := strings.TrimSpace(
			itemInput.UnitPrice,
		)

		if unitPriceString == "" {
			unitPriceString = product.Price
		}

		unitPrice, err := parseMoney(
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

		itemDiscount, err := parseMoney(
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

		// ----------------------------------------------------
		// Calculate item subtotal
		// ----------------------------------------------------

		itemSubtotal := unitPrice.Mul(
			decimal.NewFromInt(
				int64(itemInput.Quantity),
			),
		)

		// ----------------------------------------------------
		// Validate item discount
		// ----------------------------------------------------

		if itemDiscount.GreaterThan(
			itemSubtotal,
		) {

			return nil, fmt.Errorf(
				"item discount cannot exceed item subtotal",
			)
		}

		// ----------------------------------------------------
		// Calculate item total
		// ----------------------------------------------------

		itemTotal := itemSubtotal.Sub(
			itemDiscount,
		)

		subtotal = subtotal.Add(
			itemTotal,
		)

		// ----------------------------------------------------
		// Build invoice item
		// ----------------------------------------------------

		items = append(
			items,
			models.InvoiceItem{
				ProductID: itemInput.ProductID,
				Quantity:  itemInput.Quantity,
				UnitPrice: unitPrice.StringFixed(2),
				Discount:  itemDiscount.StringFixed(2),
				Total:     itemTotal.StringFixed(2),
			},
		)
	}

	// --------------------------------------------------------
	// Calculate invoice total
	// --------------------------------------------------------

	total := subtotal.
		Sub(discount).
		Add(tax)

	if total.IsNegative() {
		return nil, fmt.Errorf(
			"invoice total cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Create invoice
	// --------------------------------------------------------

	invoice := &models.Invoice{
		CustomerID:    input.CustomerID,
		InvoiceNumber: input.InvoiceNumber,
		InvoiceDate:   invoiceDate,
		DueDate:       input.DueDate,
		Status:        status,
		Subtotal:      subtotal.StringFixed(2),
		Discount:      discount.StringFixed(2),
		Tax:           tax.StringFixed(2),
		Total:         total.StringFixed(2),
		Notes:         input.Notes,
	}

	// --------------------------------------------------------
	// Save invoice
	// --------------------------------------------------------

	err = invoice.Save(tx)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Save invoice items
	// --------------------------------------------------------

	for index := range items {

		items[index].InvoiceID = invoice.ID

		err = items[index].Save(tx)

		if err != nil {
			return nil, err
		}
	}

	// --------------------------------------------------------
	// Commit transaction
	// --------------------------------------------------------

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Build response
	// --------------------------------------------------------

	response := &InvoiceWithItems{
		Invoice: *invoice,
		Items: make(
			[]InvoiceItemWithProduct,
			0,
			len(items),
		),
	}

	for _, item := range items {

		var productName string

		err := db.DB.Get(
			&productName,
			`
			SELECT name
			FROM products
			WHERE id = $1
			`,
			item.ProductID,
		)

		if err != nil {
			return nil, err
		}

		response.Items = append(
			response.Items,
			InvoiceItemWithProduct{
				InvoiceItem: item,
				ProductName: productName,
			},
		)
	}

	return response, nil
}

// ============================================================
// Get All Invoices
// ============================================================

func GetInvoices() ([]InvoiceWithItems, error) {

	var invoices []models.Invoice

	query := `
		SELECT
			i.id,
			i.customer_id,
			COALESCE(
				NULLIF(TRIM(c.display_name), ''),
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
		ORDER BY i.id DESC
	`

	err := db.DB.Select(
		&invoices,
		query,
	)

	if err != nil {
		return nil, err
	}

	result := make(
		[]InvoiceWithItems,
		0,
		len(invoices),
	)

	for _, invoice := range invoices {

		items, err := getInvoiceItems(
			invoice.ID,
		)

		if err != nil {
			return nil, err
		}

		result = append(
			result,
			InvoiceWithItems{
				Invoice: invoice,
				Items:   items,
			},
		)
	}

	return result, nil
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
				NULLIF(TRIM(c.display_name), ''),
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

	err := db.DB.Get(
		&invoice,
		query,
		id,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"invoice not found",
		)
	}

	items, err := getInvoiceItems(
		invoice.ID,
	)

	if err != nil {
		return nil, err
	}

	return &InvoiceWithItems{
		Invoice: invoice,
		Items:   items,
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

	err := db.DB.Select(
		&items,
		query,
		invoiceID,
	)

	if err != nil {
		return nil, err
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
	// Validate customer
	// --------------------------------------------------------

	if input.CustomerID <= 0 {
		return nil, fmt.Errorf(
			"customer id is required",
		)
	}

	// --------------------------------------------------------
	// Validate status
	// --------------------------------------------------------

	status := strings.ToUpper(
		strings.TrimSpace(input.Status),
	)

	if status == "" {
		status = "DRAFT"
	}

	if !isValidInvoiceStatus(status) {
		return nil, fmt.Errorf(
			"invalid invoice status: %s",
			status,
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
	// Parse discount
	// --------------------------------------------------------

	discount, err := parseMoney(
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

	tax, err := parseMoney(
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

	tx, err := db.DB.Beginx()

	if err != nil {
		return nil, err
	}

	defer tx.Rollback()

	// --------------------------------------------------------
	// Check invoice exists
	// --------------------------------------------------------

	var existingInvoice models.Invoice

	err = tx.Get(
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
		return nil, fmt.Errorf(
			"invoice not found",
		)
	}

	// --------------------------------------------------------
	// Don't allow modification of paid/cancelled invoices
	// --------------------------------------------------------

	if existingInvoice.Status == "PAID" ||
		existingInvoice.Status == "CANCELLED" {

		return nil, fmt.Errorf(
			"cannot update a %s invoice",
			existingInvoice.Status,
		)
	}

	// --------------------------------------------------------
	// Validate customer
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
	// Determine invoice date
	// --------------------------------------------------------

	invoiceDate := existingInvoice.InvoiceDate

	if input.InvoiceDate != nil {
		invoiceDate = *input.InvoiceDate
	}

	// --------------------------------------------------------
	// Determine due date
	// --------------------------------------------------------

	dueDate := existingInvoice.DueDate

	if input.DueDate != nil {
		dueDate = input.DueDate
	}

	// --------------------------------------------------------
	// Validate due date
	// --------------------------------------------------------

	if dueDate != nil &&
		dueDate.Before(invoiceDate) {

		return nil, fmt.Errorf(
			"due date cannot be before invoice date",
		)
	}

	// --------------------------------------------------------
	// Calculate new items
	// --------------------------------------------------------

	subtotal := decimal.Zero

	items := make(
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

		// ----------------------------------------------------
		// Get product
		// ----------------------------------------------------

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
		// Determine unit price
		// ----------------------------------------------------

		unitPriceString := strings.TrimSpace(
			itemInput.UnitPrice,
		)

		if unitPriceString == "" {
			unitPriceString = product.Price
		}

		unitPrice, err := parseMoney(
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

		itemDiscount, err := parseMoney(
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

		// ----------------------------------------------------
		// Calculate item subtotal
		// ----------------------------------------------------

		itemSubtotal := unitPrice.Mul(
			decimal.NewFromInt(
				int64(itemInput.Quantity),
			),
		)

		// ----------------------------------------------------
		// Validate item discount
		// ----------------------------------------------------

		if itemDiscount.GreaterThan(
			itemSubtotal,
		) {

			return nil, fmt.Errorf(
				"item discount cannot exceed item subtotal",
			)
		}

		// ----------------------------------------------------
		// Calculate item total
		// ----------------------------------------------------

		itemTotal := itemSubtotal.Sub(
			itemDiscount,
		)

		subtotal = subtotal.Add(
			itemTotal,
		)

		// ----------------------------------------------------
		// Build invoice item
		// ----------------------------------------------------

		items = append(
			items,
			models.InvoiceItem{
				InvoiceID: id,
				ProductID: itemInput.ProductID,
				Quantity:  itemInput.Quantity,
				UnitPrice: unitPrice.StringFixed(2),
				Discount:  itemDiscount.StringFixed(2),
				Total:     itemTotal.StringFixed(2),
			},
		)
	}

	// --------------------------------------------------------
	// Calculate invoice total
	// --------------------------------------------------------

	total := subtotal.
		Sub(discount).
		Add(tax)

	if total.IsNegative() {
		return nil, fmt.Errorf(
			"invoice total cannot be negative",
		)
	}

	// --------------------------------------------------------
	// Update invoice
	// --------------------------------------------------------

	_, err = tx.Exec(
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
	// Delete existing items
	// --------------------------------------------------------

	_, err = tx.Exec(
		`
		DELETE FROM invoice_items
		WHERE invoice_id = $1
		`,
		id,
	)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Insert new items
	// --------------------------------------------------------

	for index := range items {

		err = items[index].Save(tx)

		if err != nil {
			return nil, err
		}
	}

	// --------------------------------------------------------
	// Commit
	// --------------------------------------------------------

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Return updated invoice
	// --------------------------------------------------------

	return GetInvoiceByID(id)
}

// ============================================================
// Delete Invoice
// ============================================================

func DeleteInvoice(id int64) error {

	if id <= 0 {
		return fmt.Errorf(
			"invalid invoice id",
		)
	}

	// --------------------------------------------------------
	// Start transaction
	// --------------------------------------------------------

	tx, err := db.DB.Beginx()

	if err != nil {
		return err
	}

	defer tx.Rollback()

	// --------------------------------------------------------
	// Get invoice status
	// --------------------------------------------------------

	var status string

	err = tx.Get(
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
		return fmt.Errorf(
			"invoice not found",
		)
	}

	// --------------------------------------------------------
	// Prevent deleting paid/cancelled invoices
	// --------------------------------------------------------

	if status == "PAID" ||
		status == "CANCELLED" {

		return fmt.Errorf(
			"cannot delete a %s invoice",
			status,
		)
	}

	// --------------------------------------------------------
	// Delete invoice
	//
	// invoice_items should be automatically deleted because
	// invoice_items.invoice_id uses ON DELETE CASCADE.
	// --------------------------------------------------------

	result, err := tx.Exec(
		`
		DELETE FROM invoices
		WHERE id = $1
		`,
		id,
	)

	if err != nil {
		return err
	}

	// --------------------------------------------------------
	// Check affected rows
	// --------------------------------------------------------

	rowsAffected, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf(
			"invoice not found",
		)
	}

	// --------------------------------------------------------
	// Commit
	// --------------------------------------------------------

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

// ============================================================
// Helper: Validate Invoice Status
// ============================================================

func isValidInvoiceStatus(
	status string,
) bool {

	switch status {

	case "DRAFT":
		return true

	case "ISSUED":
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
// Helper: Parse Money
// ============================================================

func parseMoney(
	value string,
	fieldName string,
) (decimal.Decimal, error) {

	value = strings.TrimSpace(value)

	if value == "" {
		return decimal.Zero, nil
	}

	result, err := decimal.NewFromString(value)

	if err != nil {
		return decimal.Zero, fmt.Errorf(
			"invalid %s: %s",
			fieldName,
			value,
		)
	}

	// The database uses two decimal places.
	// Reject values with more than two decimal places.
	if result.Exponent() < -2 {
		return decimal.Zero, fmt.Errorf(
			"%s cannot have more than 2 decimal places",
			fieldName,
		)
	}

	return result, nil
}
