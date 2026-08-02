package models

import (
	"time"

	"github.com/jmoiron/sqlx"
)

type Category struct {
	ID          int64     `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// Save inserts a new category
func (c *Category) Save(tx *sqlx.Tx) error {

	query := `
		INSERT INTO categories
		(
			name,
			description
		)
		VALUES
		(
			$1,
			$2
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return tx.QueryRowx(
		query,
		c.Name,
		c.Description,
	).Scan(
		&c.ID,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
}
