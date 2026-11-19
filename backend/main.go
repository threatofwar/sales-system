package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"go-login-restapi/auth"
	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/handlers"
	"go-login-restapi/pkg/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	ALLOWORIGINS_URL := os.Getenv("ALLOWORIGINS_URL")
	allowedOrigins := strings.Split(ALLOWORIGINS_URL, ",")
	if gin.Mode() != gin.ReleaseMode && !contains(allowedOrigins, "http://localhost:4201") {
		allowedOrigins = append(allowedOrigins, "http://localhost:4201")
	}

	auth0Domain := os.Getenv("AUTH0_DOMAIN")
	auth0Audience := os.Getenv("AUTH0_AUDIENCE")
	if gin.Mode() != gin.ReleaseMode {
		if auth0Domain == "" {
			auth0Domain = "dev-tt4k8xbex7v1qfuk.us.auth0.com"
		}
		if auth0Audience == "" {
			auth0Audience = "https://api.shibidi.my"
		}
	}
	authMiddleware, err := auth.NewAuthMiddleware(auth0Domain, auth0Audience)
	if err != nil {
		log.Fatalf("Could not configure Auth0: %v", err)
	}

	// Initialize database
	db.InitDB()
	// db.RunMigrations()
	// db.CreateTables()
	// models.InsertTestUser()
	// models.InsertTestUserEmail()
	// models.InsertTestCustomer()
	// models.InsertTestCompany()

	// router := gin.Default()
	router := gin.New()

	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	router.SetTrustedProxies(nil)

	// CORS config
	router.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{},
		AllowCredentials: true,
		MaxAge:           12 * 3600,
	}))

	// routes without auth
	router.GET("/hello", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello, world!"})
	})
	// authentication route
	router.POST("/login", auth.Login)
	router.POST("/logout", auth.Logout)
	router.POST("/refresh-token", auth.RefreshToken)
	router.GET("/authenticated", func(c *gin.Context) {
		auth.IsAuthenticated(c.Writer, c.Request)
	})

	// register new user route
	router.POST("/register", auth.Register)
	router.POST("/generate-verification-token", handlers.GenerateVerificationTokenHandler)
	router.POST("/verify-email", handlers.VerifyEmailHandler)
	router.GET("/check-username", func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(400, gin.H{"error": "Username is required"})
			return
		}

		// Check if username exists in the database
		exists, err := services.CheckUserExists(username)
		if err != nil {
			c.JSON(500, gin.H{"error": "Internal Server Error"})
			return
		}

		// Respond with availability status
		c.JSON(200, gin.H{"available": !exists})
	})

	// password reset routes
	router.POST("/forgot-password", handlers.ForgotPasswordHandler)
	router.POST("/reset-password", handlers.ResetPasswordHandler)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// routes with auth
	authGroup := router.Group("/auth", authMiddleware)
	authGroup.GET("/profile", func(c *gin.Context) {
		subject, exists := c.Get("auth0_subject")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"subject": subject,
		})
	})
	// customer routes protected by auth middleware
	authGroup.GET("/customers", handlers.GetCustomersHandler)
	authGroup.GET("/customers/:id", handlers.GetCustomerByIDHandler)
	authGroup.POST("/customers", handlers.CreateCustomerHandler)
	authGroup.PUT("/customers/:id", handlers.UpdateCustomerHandler)
	authGroup.DELETE("/customers/:id", handlers.DeleteCustomerHandler)

	// company routes protected by auth middleware
	authGroup.GET("/company", handlers.GetCompaniesHandler)
	authGroup.GET("/company/:id", handlers.GetCompanyByIDHandler)
	authGroup.POST("/company", handlers.CreateCompanyHandler)
	authGroup.PUT("/company/:id", handlers.UpdateCompanyHandler)
	authGroup.DELETE("/company/:id", handlers.DeleteCompanyHandler)

	// category routes protected by auth middleware
	authGroup.GET("/category", handlers.GetCategoriesHandler)
	authGroup.GET("/category/:id", handlers.GetCategoryByIDHandler)
	authGroup.POST("/category", handlers.CreateCategoryHandler)
	authGroup.PUT("/category/:id", handlers.UpdateCategoryHandler)
	authGroup.DELETE("/category/:id", handlers.DeleteCategoryHandler)

	// product routes protected by auth middleware
	authGroup.GET("/product", handlers.GetProductsHandler)
	authGroup.GET("/product/:id", handlers.GetProductByIDHandler)
	authGroup.POST("/product", handlers.CreateProductHandler)
	authGroup.PUT("/product/:id", handlers.UpdateProductHandler)
	authGroup.DELETE("/product/:id", handlers.DeleteProductHandler)

	// stock-transaction routes protected by auth middleware
	authGroup.GET("/stock-transaction", handlers.GetStockTransactions)
	authGroup.GET("/stock-transaction/:id", handlers.GetStockTransactionByID)
	authGroup.POST("/stock-transaction", handlers.CreateStockTransaction)

	// consignment routes protected by auth middleware
	authGroup.GET("/consignment", handlers.GetConsignments)
	authGroup.GET("/consignment/:id", handlers.GetConsignmentByID)
	authGroup.POST("/consignment", handlers.CreateConsignment)
	authGroup.POST("/consignment/:id/settle", handlers.SettleConsignment)

	// invoice routes protected by auth middleware
	authGroup.GET("/invoice", handlers.GetInvoices)
	authGroup.GET("/invoice/:id", handlers.GetInvoiceByID)
	authGroup.POST("/invoice", handlers.CreateInvoice)
	authGroup.PUT("/invoice/:id", handlers.UpdateInvoice)
	authGroup.DELETE("/invoice/:id", handlers.DeleteInvoice)

	// payment routes protected by auth middleware
	authGroup.GET("/payment", handlers.GetPayments)
	authGroup.GET("/payment/:id", handlers.GetPaymentByID)
	authGroup.POST("/payment", handlers.CreatePayment)
	authGroup.GET("/payment/invoice/:invoice_id", handlers.GetPaymentsByInvoiceID)

	// dashboard route protected by auth middleware
	authGroup.GET("/dashboard", handlers.GetDashboard)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router.Run(":" + port)
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == target {
			return true
		}
	}
	return false
}
