package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/services"
)

// ============================================================
// Create Payment
// POST /auth/payment
// ============================================================

func CreatePayment(
	c *gin.Context,
) {

	var input services.CreatePaymentInput

	if err :=
		c.ShouldBindJSON(
			&input,
		); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	payment, err :=
		services.CreatePayment(
			&input,
		)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "payment created successfully",

			"payment": payment,
		},
	)
}

// ============================================================
// Get Payments
//
// GET /auth/payment
//
// Query parameters:
//
// page
// page_size
// search
// payment_method
// sort_by
// sort_order
//
// Example:
//
// /auth/payment?page=1&page_size=20
// &search=Yori
// &payment_method=BANK_TRANSFER
// &sort_by=amount
// &sort_order=desc
// ============================================================

func GetPayments(
	c *gin.Context,
) {

	// --------------------------------------------------------
	// Defaults
	// --------------------------------------------------------

	page := 1

	pageSize := 20

	search :=
		strings.TrimSpace(
			c.Query(
				"search",
			),
		)

	paymentMethod :=
		strings.ToUpper(
			strings.TrimSpace(
				c.Query(
					"payment_method",
				),
			),
		)

	sortBy :=
		strings.ToLower(
			strings.TrimSpace(
				c.Query(
					"sort_by",
				),
			),
		)

	sortOrder :=
		strings.ToLower(
			strings.TrimSpace(
				c.Query(
					"sort_order",
				),
			),
		)

	// --------------------------------------------------------
	// Parse page
	// --------------------------------------------------------

	if value :=
		c.Query(
			"page",
		); value != "" {

		parsedPage, err :=
			strconv.Atoi(
				value,
			)

		if err != nil ||
			parsedPage <= 0 {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"error": "page must be a positive integer",
				},
			)

			return
		}

		page =
			parsedPage
	}

	// --------------------------------------------------------
	// Parse page_size
	// --------------------------------------------------------

	if value :=
		c.Query(
			"page_size",
		); value != "" {

		parsedPageSize, err :=
			strconv.Atoi(
				value,
			)

		if err != nil ||
			parsedPageSize <= 0 {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"error": "page_size must be a positive integer",
				},
			)

			return
		}

		pageSize =
			parsedPageSize
	}

	// --------------------------------------------------------
	// Maximum page size
	// --------------------------------------------------------

	if pageSize > 100 {
		pageSize = 100
	}

	// --------------------------------------------------------
	// Build options
	// --------------------------------------------------------

	options :=
		services.PaymentListOptions{

			Page: page,

			PageSize: pageSize,

			Search: search,

			PaymentMethod: paymentMethod,

			SortBy: sortBy,

			SortOrder: sortOrder,
		}

	// --------------------------------------------------------
	// Retrieve payments
	// --------------------------------------------------------

	result, err :=
		services.GetPayments(
			options,
		)

	if err != nil {

		/*
		 * These are query parameter errors,
		 * so return HTTP 400 rather than 500.
		 */
		if strings.Contains(
			err.Error(),
			"invalid payment method filter",
		) ||
			strings.Contains(
				err.Error(),
				"invalid sort_by",
			) ||
			strings.Contains(
				err.Error(),
				"sort_order",
			) {

			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"error": err.Error(),
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		result,
	)
}

// ============================================================
// Get Payment By ID
// GET /auth/payment/:id
// ============================================================

func GetPaymentByID(
	c *gin.Context,
) {

	id, err :=
		strconv.ParseInt(
			c.Param(
				"id",
			),
			10,
			64,
		)

	if err != nil ||
		id <= 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid payment id",
			},
		)

		return
	}

	payment, err :=
		services.GetPaymentByID(
			id,
		)

	if err != nil {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"payment": payment,
		},
	)
}

// ============================================================
// Get Payments By Invoice ID
// GET /auth/payment/invoice/:invoice_id
// ============================================================

func GetPaymentsByInvoiceID(
	c *gin.Context,
) {

	invoiceID, err :=
		strconv.ParseInt(
			c.Param(
				"invoice_id",
			),
			10,
			64,
		)

	if err != nil ||
		invoiceID <= 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid invoice id",
			},
		)

		return
	}

	summary, err :=
		services.GetPaymentsByInvoiceID(
			invoiceID,
		)

	if err != nil {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"payment_summary": summary,
		},
	)
}
