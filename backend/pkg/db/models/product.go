package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type Product struct {
	ID            int64    `db:"id" json:"id"`
	CategoryID    int64    `db:"category_id" json:"category_id"`
	Name          string   `db:"name" json:"name"`
	Description   string   `db:"description" json:"description"`
	SKU           *string  `db:"sku" json:"sku"`
	Price         float64  `db:"price" json:"price"`
	CostPrice     *float64 `db:"cost_price" json:"cost_price"`
	StockQuantity int      `db:"stock_quantity" json:"stock_quantity"`
	IsActive      bool     `db:"is_active" json:"is_active"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Save inserts a new product.
func (p *Product) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO products
		(
			category_id,
			name,
			description,
			sku,
			price,
			cost_price,
			stock_quantity,
			is_active
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
			$8
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,
		p.CategoryID,
		p.Name,
		p.Description,
		p.SKU,
		p.Price,
		p.CostPrice,
		p.StockQuantity,
		p.IsActive,
	).Scan(
		&p.ID,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
}
