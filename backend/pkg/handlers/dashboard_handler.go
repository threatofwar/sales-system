package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-login-restapi/pkg/services"
)

// ============================================================
// GET /auth/dashboard
// ============================================================

func GetDashboard(
	c *gin.Context,
) {

	dashboard, err :=
		services.GetDashboardSummary()

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
			"dashboard": dashboard,
		},
	)
}
