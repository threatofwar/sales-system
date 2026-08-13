package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/db/models"
	"go-login-restapi/pkg/services"
)

// ============================================================
// Create Stock Transaction
// POST /auth/stock-transaction
// ============================================================

func CreateStockTransaction(
	c *gin.Context,
) {

	var transaction models.StockTransaction

	if err :=
		c.ShouldBindJSON(
			&transaction,
		); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid request body",
			},
		)

		return
	}

	err :=
		services.CreateStockTransaction(
			&transaction,
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
			"message": "stock transaction created successfully",

			"transaction": transaction,
		},
	)
}

// ============================================================
// Get Stock Transactions
//
// GET /auth/stock-transaction
//
// Query parameters:
//
// page
// page_size
// search
// transaction_type
// sort_by
// sort_order
// ============================================================

func GetStockTransactions(
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

	transactionType :=
		strings.ToUpper(
			strings.TrimSpace(
				c.Query(
					"transaction_type",
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
	// Page
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
	// Page size
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

	if pageSize > 100 {

		pageSize =
			100
	}

	// --------------------------------------------------------
	// Options
	// --------------------------------------------------------

	options :=
		services.StockTransactionListOptions{
			Page: page,

			PageSize: pageSize,

			Search: search,

			TransactionType: transactionType,

			SortBy: sortBy,

			SortOrder: sortOrder,
		}

	// --------------------------------------------------------
	// Retrieve
	// --------------------------------------------------------

	result, err :=
		services.GetStockTransactions(
			options,
		)

	if err != nil {

		if strings.Contains(
			err.Error(),
			"invalid transaction type filter",
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
// Get Stock Transaction By ID
// GET /auth/stock-transaction/:id
// ============================================================

func GetStockTransactionByID(
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
				"error": "invalid stock transaction id",
			},
		)

		return
	}

	transaction, err :=
		services.GetStockTransactionByID(
			id,
		)

	if err != nil {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": "stock transaction not found",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"transaction": transaction,
		},
	)
}
