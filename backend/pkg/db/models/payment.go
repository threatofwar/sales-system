package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

// Payment represents a payment made against an invoice.
type Payment struct {
	ID int64 `db:"id" json:"id"`

	InvoiceID int64 `db:"invoice_id" json:"invoice_id"`

	Amount string `db:"amount" json:"amount"`

	PaymentMethod string `db:"payment_method" json:"payment_method"`

	PaymentDate time.Time `db:"payment_date" json:"payment_date"`

	ReferenceNo *string `db:"reference_no" json:"reference_no,omitempty"`

	Notes *string `db:"notes" json:"notes,omitempty"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`

	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Save inserts a new payment using the supplied transaction.
func (payment *Payment) Save(
	tx *sqlx.Tx,
) error {

	query := `
		INSERT INTO payments
		(
			invoice_id,
			amount,
			payment_method,
			payment_date,
			reference_no,
			notes
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4,
			$5,
			$6
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,
		payment.InvoiceID,
		payment.Amount,
		payment.PaymentMethod,
		payment.PaymentDate,
		payment.ReferenceNo,
		payment.Notes,
	).Scan(
		&payment.ID,
		&payment.CreatedAt,
		&payment.UpdatedAt,
	)
}
