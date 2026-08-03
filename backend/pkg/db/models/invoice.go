package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type Invoice struct {
	ID            int64  `db:"id" json:"id"`
	CustomerID    int64  `db:"customer_id" json:"customer_id"`
	CustomerName  string `db:"customer_name" json:"customer_name"`
	InvoiceNumber string `db:"invoice_number" json:"invoice_number"`

	InvoiceDate time.Time  `db:"invoice_date" json:"invoice_date"`
	DueDate     *time.Time `db:"due_date" json:"due_date,omitempty"`

	Status string `db:"status" json:"status"`

	Subtotal string `db:"subtotal" json:"subtotal"`
	Discount string `db:"discount" json:"discount"`
	Tax      string `db:"tax" json:"tax"`
	Total    string `db:"total" json:"total"`

	Notes *string `db:"notes" json:"notes,omitempty"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`

	Items []InvoiceItem `json:"items,omitempty"`
}

// Save inserts a new invoice.
func (i *Invoice) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO invoices
		(
			customer_id,
			invoice_number,
			invoice_date,
			due_date,
			status,
			subtotal,
			discount,
			tax,
			total,
			notes
		)
		VALUES
		(
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			$8,
			$9,
			$10
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,
		i.CustomerID,
		i.InvoiceNumber,
		i.InvoiceDate,
		i.DueDate,
		i.Status,
		i.Subtotal,
		i.Discount,
		i.Tax,
		i.Total,
		i.Notes,
	).Scan(
		&i.ID,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
}
