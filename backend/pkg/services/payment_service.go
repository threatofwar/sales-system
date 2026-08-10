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

// CreatePaymentInput represents a request to create a payment.
type CreatePaymentInput struct {
	InvoiceID int64 `json:"invoice_id"`

	Amount string `json:"amount"`

	PaymentMethod string `json:"payment_method"`

	PaymentDate *time.Time `json:"payment_date,omitempty"`

	ReferenceNo *string `json:"reference_no,omitempty"`

	Notes *string `json:"notes,omitempty"`
}

// PaymentWithInvoice contains payment and invoice information.
type PaymentWithInvoice struct {
	models.Payment

	InvoiceNumber string `db:"invoice_number" json:"invoice_number"`

	InvoiceTotal string `db:"invoice_total" json:"invoice_total"`

	InvoiceStatus string `db:"invoice_status" json:"invoice_status"`

	CustomerID int64 `db:"customer_id" json:"customer_id"`

	CustomerName string `db:"customer_name" json:"customer_name"`
}

// InvoicePaymentSummary represents payment totals for an invoice.
type InvoicePaymentSummary struct {
	InvoiceID int64 `json:"invoice_id"`

	InvoiceNumber string `json:"invoice_number"`

	InvoiceTotal string `json:"invoice_total"`

	AmountPaid string `json:"amount_paid"`

	OutstandingBalance string `json:"outstanding_balance"`

	Status string `json:"status"`

	Payments []PaymentWithInvoice `json:"payments"`
}

// invoicePaymentDetails is used internally while processing a payment.
type invoicePaymentDetails struct {
	ID int64 `db:"id"`

	InvoiceNumber string `db:"invoice_number"`

	Total string `db:"total"`

	Status string `db:"status"`
}

// ============================================================
// Create Payment
// ============================================================

func CreatePayment(
	input *CreatePaymentInput,
) (*PaymentWithInvoice, error) {

	if input == nil {
		return nil, fmt.Errorf(
			"request body is required",
		)
	}

	if input.InvoiceID <= 0 {
		return nil, fmt.Errorf(
			"invoice id is required",
		)
	}

	// --------------------------------------------------------
	// Parse and validate amount
	// --------------------------------------------------------

	amount, err := parsePaymentMoney(
		input.Amount,
		"payment amount",
	)

	if err != nil {
		return nil, err
	}

	if amount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf(
			"payment amount must be greater than zero",
		)
	}

	// --------------------------------------------------------
	// Validate payment method
	// --------------------------------------------------------

	paymentMethod := strings.ToUpper(
		strings.TrimSpace(
			input.PaymentMethod,
		),
	)

	if paymentMethod == "" {
		return nil, fmt.Errorf(
			"payment method is required",
		)
	}

	if !isValidPaymentMethod(paymentMethod) {
		return nil, fmt.Errorf(
			"invalid payment method: %s",
			paymentMethod,
		)
	}

	// --------------------------------------------------------
	// Clean optional values
	// --------------------------------------------------------

	referenceNo := cleanOptionalString(
		input.ReferenceNo,
	)

	notes := cleanOptionalString(
		input.Notes,
	)

	// --------------------------------------------------------
	// Determine payment date
	// --------------------------------------------------------

	paymentDate := time.Now()

	if input.PaymentDate != nil {
		paymentDate = *input.PaymentDate
	}

	// --------------------------------------------------------
	// Start database transaction
	// --------------------------------------------------------

	tx, err := db.DB.Beginx()

	if err != nil {
		return nil, err
	}

	defer tx.Rollback()

	// --------------------------------------------------------
	// Load and lock invoice
	// --------------------------------------------------------

	var invoice invoicePaymentDetails

	err = tx.Get(
		&invoice,
		`
		SELECT
			id,
			invoice_number,
			total,
			status
		FROM invoices
		WHERE id = $1
		FOR UPDATE
		`,
		input.InvoiceID,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"invoice not found",
		)
	}

	invoiceStatus := strings.ToUpper(
		strings.TrimSpace(
			invoice.Status,
		),
	)

	// --------------------------------------------------------
	// Validate invoice status
	// --------------------------------------------------------

	switch invoiceStatus {

	case "DRAFT":
		return nil, fmt.Errorf(
			"cannot add payment to a DRAFT invoice",
		)

	case "CANCELLED":
		return nil, fmt.Errorf(
			"cannot add payment to a CANCELLED invoice",
		)

	case "PAID":
		return nil, fmt.Errorf(
			"invoice is already fully paid",
		)

	case "ISSUED", "PARTIAL":
		// Payment is allowed.

	default:
		return nil, fmt.Errorf(
			"invoice has unsupported status: %s",
			invoiceStatus,
		)
	}

	// --------------------------------------------------------
	// Parse invoice total
	// --------------------------------------------------------

	invoiceTotal, err := decimal.NewFromString(
		invoice.Total,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"invalid invoice total",
		)
	}

	// --------------------------------------------------------
	// Get current amount paid
	// --------------------------------------------------------

	var amountPaidString string

	err = tx.Get(
		&amountPaidString,
		`
		SELECT
			COALESCE(
				SUM(amount),
				0
			)::TEXT
		FROM payments
		WHERE invoice_id = $1
		`,
		input.InvoiceID,
	)

	if err != nil {
		return nil, err
	}

	amountPaid, err := decimal.NewFromString(
		amountPaidString,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"invalid existing payment total",
		)
	}

	// --------------------------------------------------------
	// Calculate outstanding balance
	// --------------------------------------------------------

	outstandingBalance :=
		invoiceTotal.Sub(amountPaid)

	if outstandingBalance.LessThanOrEqual(
		decimal.Zero,
	) {
		return nil, fmt.Errorf(
			"invoice has no outstanding balance",
		)
	}

	if amount.GreaterThan(
		outstandingBalance,
	) {
		return nil, fmt.Errorf(
			"payment amount cannot exceed outstanding balance of %s",
			outstandingBalance.StringFixed(2),
		)
	}

	// --------------------------------------------------------
	// Create payment
	// --------------------------------------------------------

	payment := &models.Payment{
		InvoiceID: input.InvoiceID,

		Amount: amount.StringFixed(2),

		PaymentMethod: paymentMethod,

		PaymentDate: paymentDate,

		ReferenceNo: referenceNo,

		Notes: notes,
	}

	err = payment.Save(tx)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Calculate new invoice status
	// --------------------------------------------------------

	newAmountPaid :=
		amountPaid.Add(amount)

	newStatus := "PARTIAL"

	if newAmountPaid.GreaterThanOrEqual(
		invoiceTotal,
	) {
		newStatus = "PAID"
	}

	// --------------------------------------------------------
	// Update invoice status
	// --------------------------------------------------------

	_, err = tx.Exec(
		`
		UPDATE invoices
		SET
			status = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		`,
		newStatus,
		input.InvoiceID,
	)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Commit transaction
	// --------------------------------------------------------

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// --------------------------------------------------------
	// Return saved payment
	// --------------------------------------------------------

	return GetPaymentByID(
		payment.ID,
	)
}

// ============================================================
// Get All Payments
// ============================================================

func GetPayments() (
	[]PaymentWithInvoice,
	error,
) {

	var payments []PaymentWithInvoice

	query := `
		SELECT
			p.id,
			p.invoice_id,
			p.amount,
			p.payment_method,
			p.payment_date,
			p.reference_no,
			p.notes,
			p.created_at,
			p.updated_at,

			i.invoice_number,
			i.total AS invoice_total,
			i.status AS invoice_status,
			i.customer_id,

			COALESCE(
				NULLIF(
					TRIM(c.display_name),
					''
				),
				'-'
			) AS customer_name

		FROM payments p

		INNER JOIN invoices i
			ON i.id = p.invoice_id

		LEFT JOIN customers c
			ON c.id = i.customer_id

		ORDER BY
			p.payment_date DESC,
			p.id DESC
	`

	err := db.DB.Select(
		&payments,
		query,
	)

	if err != nil {
		return nil, err
	}

	if payments == nil {
		payments = []PaymentWithInvoice{}
	}

	return payments, nil
}

// ============================================================
// Get Payment By ID
// ============================================================

func GetPaymentByID(
	id int64,
) (*PaymentWithInvoice, error) {

	if id <= 0 {
		return nil, fmt.Errorf(
			"invalid payment id",
		)
	}

	var payment PaymentWithInvoice

	query := `
		SELECT
			p.id,
			p.invoice_id,
			p.amount,
			p.payment_method,
			p.payment_date,
			p.reference_no,
			p.notes,
			p.created_at,
			p.updated_at,

			i.invoice_number,
			i.total AS invoice_total,
			i.status AS invoice_status,
			i.customer_id,

			COALESCE(
				NULLIF(
					TRIM(c.display_name),
					''
				),
				'-'
			) AS customer_name

		FROM payments p

		INNER JOIN invoices i
			ON i.id = p.invoice_id

		LEFT JOIN customers c
			ON c.id = i.customer_id

		WHERE p.id = $1
	`

	err := db.DB.Get(
		&payment,
		query,
		id,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"payment not found",
		)
	}

	return &payment, nil
}

// ============================================================
// Get Payments By Invoice ID
// ============================================================

func GetPaymentsByInvoiceID(
	invoiceID int64,
) (*InvoicePaymentSummary, error) {

	if invoiceID <= 0 {
		return nil, fmt.Errorf(
			"invalid invoice id",
		)
	}

	var invoice struct {
		ID int64 `db:"id"`

		InvoiceNumber string `db:"invoice_number"`

		Total string `db:"total"`

		Status string `db:"status"`
	}

	err := db.DB.Get(
		&invoice,
		`
		SELECT
			id,
			invoice_number,
			total,
			status
		FROM invoices
		WHERE id = $1
		`,
		invoiceID,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"invoice not found",
		)
	}

	var payments []PaymentWithInvoice

	query := `
		SELECT
			p.id,
			p.invoice_id,
			p.amount,
			p.payment_method,
			p.payment_date,
			p.reference_no,
			p.notes,
			p.created_at,
			p.updated_at,

			i.invoice_number,
			i.total AS invoice_total,
			i.status AS invoice_status,
			i.customer_id,

			COALESCE(
				NULLIF(
					TRIM(c.display_name),
					''
				),
				'-'
			) AS customer_name

		FROM payments p

		INNER JOIN invoices i
			ON i.id = p.invoice_id

		LEFT JOIN customers c
			ON c.id = i.customer_id

		WHERE p.invoice_id = $1

		ORDER BY
			p.payment_date DESC,
			p.id DESC
	`

	err = db.DB.Select(
		&payments,
		query,
		invoiceID,
	)

	if err != nil {
		return nil, err
	}

	if payments == nil {
		payments = []PaymentWithInvoice{}
	}

	invoiceTotal, err := decimal.NewFromString(
		invoice.Total,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"invalid invoice total",
		)
	}

	amountPaid := decimal.Zero

	for _, payment := range payments {

		paymentAmount, err :=
			decimal.NewFromString(
				payment.Amount,
			)

		if err != nil {
			return nil, fmt.Errorf(
				"invalid payment amount",
			)
		}

		amountPaid =
			amountPaid.Add(
				paymentAmount,
			)
	}

	outstandingBalance :=
		invoiceTotal.Sub(amountPaid)

	if outstandingBalance.IsNegative() {
		outstandingBalance =
			decimal.Zero
	}

	return &InvoicePaymentSummary{
		InvoiceID: invoice.ID,

		InvoiceNumber: invoice.InvoiceNumber,

		InvoiceTotal: invoiceTotal.StringFixed(2),

		AmountPaid: amountPaid.StringFixed(2),

		OutstandingBalance: outstandingBalance.StringFixed(2),

		Status: invoice.Status,

		Payments: payments,
	}, nil
}

// ============================================================
// Helper: Validate Payment Method
// ============================================================

func isValidPaymentMethod(
	method string,
) bool {

	switch method {

	case "CASH":
		return true

	case "BANK_TRANSFER":
		return true

	case "CARD":
		return true

	case "E_WALLET":
		return true

	case "OTHER":
		return true

	default:
		return false
	}
}

// ============================================================
// Helper: Parse Payment Money
// ============================================================

func parsePaymentMoney(
	value string,
	fieldName string,
) (decimal.Decimal, error) {

	value = strings.TrimSpace(
		value,
	)

	if value == "" {
		return decimal.Zero, fmt.Errorf(
			"%s is required",
			fieldName,
		)
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

// ============================================================
// Helper: Clean Optional String
// ============================================================

func cleanOptionalString(
	value *string,
) *string {

	if value == nil {
		return nil
	}

	cleaned := strings.TrimSpace(
		*value,
	)

	if cleaned == "" {
		return nil
	}

	return &cleaned
}
