package services

import (
	"fmt"

	"go-login-restapi/pkg/db"
)

// ============================================================
// Dashboard Structures
// ============================================================

type DashboardInvoiceCounts struct {
	Draft     int `db:"draft" json:"draft"`
	Issued    int `db:"issued" json:"issued"`
	Partial   int `db:"partial" json:"partial"`
	Paid      int `db:"paid" json:"paid"`
	Cancelled int `db:"cancelled" json:"cancelled"`
}

type DashboardRecentInvoice struct {
	ID            int64  `db:"id" json:"id"`
	InvoiceNumber string `db:"invoice_number" json:"invoice_number"`
	CustomerID    int64  `db:"customer_id" json:"customer_id"`
	CustomerName  string `db:"customer_name" json:"customer_name"`
	Status        string `db:"status" json:"status"`
	Total         string `db:"total" json:"total"`
	InvoiceDate   string `db:"invoice_date" json:"invoice_date"`
}

type DashboardRecentPayment struct {
	ID            int64  `db:"id" json:"id"`
	InvoiceID     int64  `db:"invoice_id" json:"invoice_id"`
	InvoiceNumber string `db:"invoice_number" json:"invoice_number"`
	CustomerName  string `db:"customer_name" json:"customer_name"`
	Amount        string `db:"amount" json:"amount"`
	PaymentMethod string `db:"payment_method" json:"payment_method"`
	PaymentDate   string `db:"payment_date" json:"payment_date"`
}

type DashboardLowStockProduct struct {
	ID            int64  `db:"id" json:"id"`
	Name          string `db:"name" json:"name"`
	SKU           string `db:"sku" json:"sku"`
	StockQuantity int    `db:"stock_quantity" json:"stock_quantity"`
}

type DashboardSummary struct {
	TotalSales         string                 `json:"total_sales"`
	AmountCollected    string                 `json:"amount_collected"`
	OutstandingBalance string                 `json:"outstanding_balance"`
	InvoiceCounts      DashboardInvoiceCounts `json:"invoice_counts"`
	LowStockCount      int                    `json:"low_stock_count"`

	RecentInvoices []DashboardRecentInvoice `json:"recent_invoices"`

	RecentPayments []DashboardRecentPayment `json:"recent_payments"`

	LowStockProducts []DashboardLowStockProduct `json:"low_stock_products"`
}

// ============================================================
// Get Dashboard Summary
// ============================================================

func GetDashboardSummary() (
	*DashboardSummary,
	error,
) {

	var summary DashboardSummary

	// ========================================================
	// Total Sales
	//
	// DRAFT and CANCELLED invoices are excluded.
	// ========================================================

	err := db.DB.Get(
		&summary.TotalSales,
		`
		SELECT
			COALESCE(
				SUM(total),
				0
			)::TEXT
		FROM invoices
		WHERE status IN (
			'ISSUED',
			'PARTIAL',
			'PAID'
		)
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to calculate total sales: %w",
			err,
		)
	}

	// ========================================================
	// Amount Collected
	// ========================================================

	err = db.DB.Get(
		&summary.AmountCollected,
		`
		SELECT
			COALESCE(
				SUM(amount),
				0
			)::TEXT
		FROM payments
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to calculate amount collected: %w",
			err,
		)
	}

	// ========================================================
	// Outstanding Balance
	//
	// Only ISSUED and PARTIAL invoices can still be owed.
	// ========================================================

	err = db.DB.Get(
		&summary.OutstandingBalance,
		`
		SELECT
			COALESCE(
				SUM(
					GREATEST(
						i.total -
						COALESCE(
							(
								SELECT
									SUM(p.amount)
								FROM payments p
								WHERE p.invoice_id = i.id
							),
							0
						),
						0
					)
				),
				0
			)::TEXT
		FROM invoices i
		WHERE i.status IN (
			'ISSUED',
			'PARTIAL'
		)
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to calculate outstanding balance: %w",
			err,
		)
	}

	// ========================================================
	// Invoice Counts
	// ========================================================

	err = db.DB.Get(
		&summary.InvoiceCounts,
		`
		SELECT
			COUNT(*) FILTER (
				WHERE status = 'DRAFT'
			) AS draft,

			COUNT(*) FILTER (
				WHERE status = 'ISSUED'
			) AS issued,

			COUNT(*) FILTER (
				WHERE status = 'PARTIAL'
			) AS partial,

			COUNT(*) FILTER (
				WHERE status = 'PAID'
			) AS paid,

			COUNT(*) FILTER (
				WHERE status = 'CANCELLED'
			) AS cancelled

		FROM invoices
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to calculate invoice counts: %w",
			err,
		)
	}

	// ========================================================
	// Low Stock Count
	//
	// Current rule:
	// stock_quantity <= 10
	// ========================================================

	err = db.DB.Get(
		&summary.LowStockCount,
		`
		SELECT
			COUNT(*)
		FROM products
		WHERE is_active = TRUE
		  AND stock_quantity <= 10
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to calculate low stock count: %w",
			err,
		)
	}

	// ========================================================
	// Recent Invoices
	//
	// Latest 5 invoices.
	// ========================================================

	err = db.DB.Select(
		&summary.RecentInvoices,
		`
		SELECT
			i.id,
			i.invoice_number,
			i.customer_id,

			COALESCE(
				NULLIF(
					TRIM(c.display_name),
					''
				),
				'-'
			) AS customer_name,

			i.status,

			i.total::TEXT
				AS total,

			i.invoice_date::TEXT
				AS invoice_date

		FROM invoices i

		LEFT JOIN customers c
			ON c.id = i.customer_id

		ORDER BY
			i.created_at DESC,
			i.id DESC

		LIMIT 5
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to retrieve recent invoices: %w",
			err,
		)
	}

	if summary.RecentInvoices == nil {
		summary.RecentInvoices =
			[]DashboardRecentInvoice{}
	}

	// ========================================================
	// Recent Payments
	//
	// Latest 5 payments.
	// ========================================================

	err = db.DB.Select(
		&summary.RecentPayments,
		`
		SELECT
			p.id,
			p.invoice_id,

			i.invoice_number,

			COALESCE(
				NULLIF(
					TRIM(c.display_name),
					''
				),
				'-'
			) AS customer_name,

			p.amount::TEXT
				AS amount,

			p.payment_method,

			p.payment_date::TEXT
				AS payment_date

		FROM payments p

		INNER JOIN invoices i
			ON i.id = p.invoice_id

		LEFT JOIN customers c
			ON c.id = i.customer_id

		ORDER BY
			p.payment_date DESC,
			p.id DESC

		LIMIT 5
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to retrieve recent payments: %w",
			err,
		)
	}

	if summary.RecentPayments == nil {
		summary.RecentPayments =
			[]DashboardRecentPayment{}
	}

	// ========================================================
	// Low Stock Products
	//
	// Returns the actual low-stock products.
	// ========================================================

	err = db.DB.Select(
		&summary.LowStockProducts,
		`
		SELECT
			id,
			name,
			COALESCE(
				sku,
				''
			) AS sku,
			stock_quantity

		FROM products

		WHERE is_active = TRUE
		  AND stock_quantity <= 10

		ORDER BY
			stock_quantity ASC,
			name ASC
		`,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"failed to retrieve low stock products: %w",
			err,
		)
	}

	if summary.LowStockProducts == nil {
		summary.LowStockProducts =
			[]DashboardLowStockProduct{}
	}

	return &summary, nil
}
