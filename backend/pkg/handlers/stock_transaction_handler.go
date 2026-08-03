package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/db/models"
	"go-login-restapi/pkg/services"
)

// ==========================================
// Create Stock Transaction
// ==========================================

func CreateStockTransaction(c *gin.Context) {

	var transaction models.StockTransaction

	if err := c.ShouldBindJSON(&transaction); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid request body",
			},
		)

		return
	}

	err := services.CreateStockTransaction(
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
			"message":     "stock transaction created successfully",
			"transaction": transaction,
		},
	)
}

// ==========================================
// Get All Stock Transactions
// ==========================================

func GetStockTransactions(c *gin.Context) {

	transactions, err :=
		services.GetStockTransactions()

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "failed to retrieve stock transactions",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"transactions": transactions,
		},
	)
}

// ==========================================
// Get Stock Transaction By ID
// ==========================================

func GetStockTransactionByID(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id <= 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid stock transaction id",
			},
		)

		return
	}

	transaction, err :=
		services.GetStockTransactionByID(id)

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
