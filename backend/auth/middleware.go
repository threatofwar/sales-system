package auth

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	jwtmiddleware "github.com/auth0/go-jwt-middleware/v3"
	"github.com/auth0/go-jwt-middleware/v3/jwks"
	"github.com/auth0/go-jwt-middleware/v3/validator"
	"github.com/gin-gonic/gin"
)

// NewAuthMiddleware validates Auth0 RS256 access tokens for protected routes.
func NewAuthMiddleware(domain, audience string) (gin.HandlerFunc, error) {
	domain = strings.TrimSpace(domain)
	audience = strings.TrimSpace(audience)
	if domain == "" || audience == "" {
		return nil, fmt.Errorf("AUTH0_DOMAIN and AUTH0_AUDIENCE are required")
	}

	if !strings.HasPrefix(domain, "https://") {
		domain = "https://" + domain
	}
	issuer := strings.TrimRight(domain, "/") + "/"
	issuerURL, err := url.Parse(issuer)
	if err != nil {
		return nil, fmt.Errorf("invalid Auth0 domain: %w", err)
	}

	provider, err := jwks.NewCachingProvider(
		jwks.WithIssuerURL(issuerURL),
		jwks.WithCacheTTL(5*time.Minute),
	)
	if err != nil {
		return nil, fmt.Errorf("create Auth0 JWKS provider: %w", err)
	}

	jwtValidator, err := validator.New(
		validator.WithKeyFunc(provider.KeyFunc),
		validator.WithAlgorithm(validator.RS256),
		validator.WithIssuer(issuer),
		validator.WithAudience(audience),
		validator.WithAllowedClockSkew(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("create Auth0 token validator: %w", err)
	}

	middleware, err := jwtmiddleware.New(
		jwtmiddleware.WithValidator(jwtValidator),
		jwtmiddleware.WithValidateOnOptions(false),
		jwtmiddleware.WithErrorHandler(func(w http.ResponseWriter, _ *http.Request, _ error) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"message":"Invalid or missing access token"}`))
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("create Auth0 middleware: %w", err)
	}

	return func(c *gin.Context) {
		validated := false
		handler := middleware.CheckJWT(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			claims, claimsErr := jwtmiddleware.GetClaims[*validator.ValidatedClaims](r.Context())
			if claimsErr != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Invalid access token claims"})
				return
			}

			validated = true
			c.Request = r
			c.Set("auth0_subject", claims.RegisteredClaims.Subject)
			c.Set("username", claims.RegisteredClaims.Subject)
			c.Next()
		}))

		handler.ServeHTTP(c.Writer, c.Request)
		if !validated {
			c.Abort()
		}
	}, nil
}
