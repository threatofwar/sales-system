package handlers

import (
	"net/http"
	"strconv"

	"go-login-restapi/pkg/db/models"
	"go-login-restapi/pkg/services"

	"github.com/gin-gonic/gin"
)

// POST /categories
func CreateCategoryHandler(c *gin.Context) {

	var category models.Category

	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid request body",
			},
		)
		return
	}

	err := services.CreateCategory(&category)

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
		gin.H{
			"message":  "category created successfully",
			"category": category,
		},
	)
}

// GET /categories
func GetCategoriesHandler(c *gin.Context) {

	categories, err := services.GetCategories()

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
			"categories": categories,
		},
	)
}

// GET /categories/:id
func GetCategoryByIDHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid category id",
			},
		)

		return
	}

	category, err := services.GetCategoryByID(id)

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
		category,
	)
}

// PUT /categories/:id
func UpdateCategoryHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid category id",
			},
		)

		return
	}

	var category models.Category

	if err := c.ShouldBindJSON(&category); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid request body",
			},
		)

		return
	}

	category.ID = id

	err = services.UpdateCategory(&category)

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
			"message":  "category updated successfully",
			"category": category,
		},
	)
}

// DELETE /categories/:id
func DeleteCategoryHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid category id",
			},
		)

		return
	}

	err = services.DeleteCategory(id)

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
			"message": "category deleted successfully",
		},
	)
}
