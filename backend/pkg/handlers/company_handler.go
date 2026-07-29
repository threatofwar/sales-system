package handlers

import (
	"net/http"
	"strconv"

	"go-login-restapi/pkg/db/models"
	"go-login-restapi/pkg/services"

	"github.com/gin-gonic/gin"
)

func CreateCompanyHandler(c *gin.Context) {

	var company models.Company

	if err := c.ShouldBindJSON(&company); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	err := services.CreateCompany(&company)

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
		company,
	)
}

func GetCompaniesHandler(c *gin.Context) {

	companies, err := services.GetCompanies()

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
		companies,
	)
}

func GetCompanyByIDHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid company id",
			},
		)

		return
	}

	company, err := services.GetCompanyByID(id)

	if err != nil {

		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": "company not found",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		company,
	)
}

func UpdateCompanyHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid company id",
			},
		)

		return
	}

	var company models.Company

	if err := c.ShouldBindJSON(&company); err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": err.Error(),
			},
		)

		return
	}

	company.ID = id

	err = services.UpdateCompany(&company)

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
		company,
	)
}

func DeleteCompanyHandler(c *gin.Context) {

	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid company id",
			},
		)

		return
	}

	err = services.DeleteCompany(id)

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
			"message": "company deleted",
		},
	)
}
