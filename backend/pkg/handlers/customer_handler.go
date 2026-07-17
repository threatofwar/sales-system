package handlers

import (
	"net/http"
	"strconv"

	"go-login-restapi/pkg/db/models"
	"go-login-restapi/pkg/services"

	"github.com/gin-gonic/gin"
)

func CreateCustomerHandler(c *gin.Context) {

	var customer models.Customer

	if err := c.ShouldBindJSON(&customer); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	err := services.CreateCustomer(&customer)

	if err != nil {

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	c.JSON(
		http.StatusCreated,
		customer,
	)
}

func GetCustomersHandler(c *gin.Context) {

	customers, err := services.GetCustomers()

	if err != nil {

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
		customers,
	)
}

func GetCustomerByIDHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid customer id",
			},
		)

		return
	}

	customer, err := services.GetCustomerByID(id)

	if err != nil {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": "customer not found",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		customer,
	)
}

func UpdateCustomerHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid customer id",
			},
		)

		return
	}

	var customer models.Customer

	if err := c.ShouldBindJSON(&customer); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	customer.ID = id

	err = services.UpdateCustomer(&customer)

	if err != nil {

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
		customer,
	)
}

func DeleteCustomerHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid customer id",
			},
		)

		return
	}

	err = services.DeleteCustomer(id)

	if err != nil {

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
		gin.H{
			"message": "customer deleted",
		},
	)
}
