package models

import (
	"github.com/jmoiron/sqlx"
)

type InvoiceItem struct {
	ID int64 `db:"id" json:"id"`

	InvoiceID int64 `db:"invoice_id" json:"invoice_id"`
	ProductID int64 `db:"product_id" json:"product_id"`

	Quantity int `db:"quantity" json:"quantity"`

	UnitPrice string `db:"unit_price" json:"unit_price"`
	Discount  string `db:"discount" json:"discount"`
	Total     string `db:"total" json:"total"`
}

// Save inserts a new invoice item.
func (i *InvoiceItem) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO invoice_items
		(
			invoice_id,
			product_id,
			quantity,
			unit_price,
			discount,
			total
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
			id
	`

	return tx.QueryRowx(
		query,
		i.InvoiceID,
		i.ProductID,
		i.Quantity,
		i.UnitPrice,
		i.Discount,
		i.Total,
	).Scan(
		&i.ID,
	)
}
