package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/db/models"
	"go-login-restapi/pkg/services"
)

func CreateProductHandler(c *gin.Context) {

	var product models.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "Invalid request data",
			},
		)
		return
	}

	if err := services.CreateProduct(&product); err != nil {
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
			"message": "Product created successfully",
			"product": product,
		},
	)
}

func GetProductsHandler(c *gin.Context) {

	products, err := services.GetProducts()

	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "Failed to retrieve products",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"products": products,
		},
	)
}

func GetProductByIDHandler(c *gin.Context) {

	idParam := c.Param("id")

	id, err := strconv.ParseInt(idParam, 10, 64)

	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "Invalid product ID",
			},
		)
		return
	}

	product, err := services.GetProductByID(id)

	if err != nil {
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": "Product not found",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"product": product,
		},
	)
}

func UpdateProductHandler(c *gin.Context) {

	idParam := c.Param("id")

	id, err := strconv.ParseInt(idParam, 10, 64)

	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "Invalid product ID",
			},
		)
		return
	}

	var product models.Product

	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "Invalid request data",
			},
		)
		return
	}

	product.ID = id

	if err := services.UpdateProduct(&product); err != nil {
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
			"message": "Product updated successfully",
			"product": product,
		},
	)
}

func DeleteProductHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid product ID",
			},
		)

		return
	}

	err = services.DeleteProduct(id)

	if err != nil {

		if err.Error() == "product not found" {

			c.JSON(
				http.StatusNotFound,
				gin.H{
					"error": "product not found",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "failed to delete product",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "product deleted successfully",
		},
	)
}
