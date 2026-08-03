package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type StockTransaction struct {
	ID              int64     `db:"id" json:"id"`
	ProductID       int64     `db:"product_id" json:"product_id"`
	TransactionType string    `db:"transaction_type" json:"transaction_type"`
	Quantity        int       `db:"quantity" json:"quantity"`
	ReferenceType   *string   `db:"reference_type" json:"reference_type,omitempty"`
	ReferenceID     *int64    `db:"reference_id" json:"reference_id,omitempty"`
	Notes           *string   `db:"notes" json:"notes,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

// StockTransactionWithProduct is used when returning
// stock transaction history together with the product name.
type StockTransactionWithProduct struct {
	ID              int64     `db:"id" json:"id"`
	ProductID       int64     `db:"product_id" json:"product_id"`
	ProductName     string    `db:"product_name" json:"product_name"`
	TransactionType string    `db:"transaction_type" json:"transaction_type"`
	Quantity        int       `db:"quantity" json:"quantity"`
	ReferenceType   *string   `db:"reference_type" json:"reference_type,omitempty"`
	ReferenceID     *int64    `db:"reference_id" json:"reference_id,omitempty"`
	Notes           *string   `db:"notes" json:"notes,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

// Save inserts a new stock transaction.
func (s *StockTransaction) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO stock_transactions
		(
			product_id,
			transaction_type,
			quantity,
			reference_type,
			reference_id,
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
			created_at
	`

	return tx.QueryRowx(
		query,
		s.ProductID,
		s.TransactionType,
		s.Quantity,
		s.ReferenceType,
		s.ReferenceID,
		s.Notes,
	).Scan(
		&s.ID,
		&s.CreatedAt,
	)
}
