package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/services"
)

// ============================================================
// Create Payment
// ============================================================

func CreatePayment(
	c *gin.Context,
) {

	var input services.CreatePaymentInput

	if err := c.ShouldBindJSON(
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
// Get All Payments
// ============================================================

func GetPayments(
	c *gin.Context,
) {

	payments, err :=
		services.GetPayments()

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "failed to retrieve payments",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"payments": payments,
		},
	)
}

// ============================================================
// Get Payment By ID
// ============================================================

func GetPaymentByID(
	c *gin.Context,
) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id <= 0 {

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
// ============================================================

func GetPaymentsByInvoiceID(
	c *gin.Context,
) {

	invoiceID, err :=
		strconv.ParseInt(
			c.Param("invoice_id"),
			10,
			64,
		)

	if err != nil || invoiceID <= 0 {

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
