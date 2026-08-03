package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/services"
)

// CreateInvoice handles POST /auth/invoice
func CreateInvoice(c *gin.Context) {

	var input services.CreateInvoiceInput

	if err := c.ShouldBindJSON(&input); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	invoice, err := services.CreateInvoice(&input)

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

// GetInvoices handles GET /auth/invoice
func GetInvoices(c *gin.Context) {

	invoices, err := services.GetInvoices()

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "failed to retrieve invoices",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"invoices": invoices,
		},
	)
}

// GetInvoiceByID handles GET /auth/invoice/:id
func GetInvoiceByID(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id <= 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid invoice id",
			},
		)

		return
	}

	invoice, err := services.GetInvoiceByID(id)

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

// UpdateInvoice handles PUT /auth/invoice/:id
func UpdateInvoice(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id <= 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid invoice id",
			},
		)

		return
	}

	var input services.UpdateInvoiceInput

	if err := c.ShouldBindJSON(&input); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	invoice, err := services.UpdateInvoice(
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

// DeleteInvoice handles DELETE /auth/invoice/:id
func DeleteInvoice(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || id <= 0 {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid invoice id",
			},
		)

		return
	}

	err = services.DeleteInvoice(id)

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
