package auth

import (
	"fmt"
	"net/http"
	"strings"

	"go-login-restapi/token"

	"github.com/gin-gonic/gin"
)

// middleware to check authenticated; used for protected routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("All Cookies:")
		for _, cookie := range c.Request.Cookies() {
			fmt.Println(cookie.Name, cookie.Value[:20])
		}

		var accessToken string

		// Retrieve token from cookie or header
		if cookieToken, err := c.Cookie("access_token"); err == nil && cookieToken != "" {
			fmt.Println("FOUND ACCESS TOKEN COOKIE")
			accessToken = cookieToken
		} else {
			accessToken = c.GetHeader("Authorization")
			fmt.Println("COOKIE ERROR:", err)
			if len(accessToken) > 7 && strings.HasPrefix(accessToken, "Bearer ") {
				accessToken = accessToken[7:]
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Authorization token is required"})
				c.Abort()
				return
			}
		}

		claims, err := token.ValidateToken(accessToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Next()
	}
}
