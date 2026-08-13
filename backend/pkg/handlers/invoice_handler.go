package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/services"
)

// ============================================================
// Create Invoice
// POST /auth/invoice
// ============================================================

func CreateInvoice(
	c *gin.Context,
) {

	var input services.CreateInvoiceInput

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

	invoice, err :=
		services.CreateInvoice(
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
			"message": "invoice created successfully",

			"invoice": invoice,
		},
	)
}

// ============================================================
// Get Invoices
//
// GET /auth/invoice
//
// Supported query parameters:
//
// page
// page_size
// search
// status
// sort_by
// sort_order
//
// Example:
//
// /auth/invoice?page=1&page_size=20
// &search=Yori
// &status=PAID
// &sort_by=total
// &sort_order=desc
// ============================================================

func GetInvoices(
	c *gin.Context,
) {

	// --------------------------------------------------------
	// Defaults
	// --------------------------------------------------------

	page :=
		1

	pageSize :=
		20

	search :=
		strings.TrimSpace(
			c.Query(
				"search",
			),
		)

	status :=
		strings.ToUpper(
			strings.TrimSpace(
				c.Query(
					"status",
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
	// Prevent extremely large page sizes
	// --------------------------------------------------------

	if pageSize > 100 {

		pageSize =
			100
	}

	// --------------------------------------------------------
	// Build service options
	// --------------------------------------------------------

	options :=
		services.InvoiceListOptions{

			Page: page,

			PageSize: pageSize,

			Search: search,

			Status: status,

			SortBy: sortBy,

			SortOrder: sortOrder,
		}

	// --------------------------------------------------------
	// Retrieve invoices
	// --------------------------------------------------------

	result, err :=
		services.GetInvoices(
			options,
		)

	if err != nil {

		/*
		 * Query parameter validation errors are
		 * client errors rather than server errors.
		 */
		if strings.Contains(
			err.Error(),
			"invalid sort_by",
		) ||
			strings.Contains(
				err.Error(),
				"sort_order",
			) ||
			strings.Contains(
				err.Error(),
				"invalid invoice status filter",
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

	// --------------------------------------------------------
	// Response
	// --------------------------------------------------------

	c.JSON(
		http.StatusOK,
		result,
	)
}

// ============================================================
// Get Invoice By ID
// GET /auth/invoice/:id
// ============================================================

func GetInvoiceByID(
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
				"error": "invalid invoice id",
			},
		)

		return
	}

	invoice, err :=
		services.GetInvoiceByID(
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
			"invoice": invoice,
		},
	)
}

// ============================================================
// Update Invoice
// PUT /auth/invoice/:id
// ============================================================

func UpdateInvoice(
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
				"error": "invalid invoice id",
			},
		)

		return
	}

	var input services.UpdateInvoiceInput

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

	invoice, err :=
		services.UpdateInvoice(
			id,
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
		http.StatusOK,
		gin.H{
			"message": "invoice updated successfully",

			"invoice": invoice,
		},
	)
}

// ============================================================
// Delete Invoice
// DELETE /auth/invoice/:id
// ============================================================

func DeleteInvoice(
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
				"error": "invalid invoice id",
			},
		)

		return
	}

	err =
		services.DeleteInvoice(
			id,
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
		http.StatusOK,
		gin.H{
			"message": "invoice deleted successfully",
		},
	)
}
