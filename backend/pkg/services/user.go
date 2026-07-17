package services

import (
	"go-login-restapi/pkg/db"
	"go-login-restapi/pkg/db/models"
	"log"
)

func FindUserByID(userID int) (models.User, error) {
	var user models.User
	err := db.DB.Get(&user, "SELECT id, username, password FROM users WHERE id = $1", userID)
	return user, err
}

func FindUserByEmail(email string) (models.User, error) {
	var user models.User
	query := `
		SELECT users.id, users.username, users.password
		FROM users
		JOIN emails ON users.id = emails.user_id
		WHERE emails.email = $1`

	err := db.DB.Get(&user, query, email)
	return user, err
}

func FindUserByUsername(username string) (models.User, error) {
	var user models.User
	err := db.DB.Get(&user, "SELECT id, username, password FROM users WHERE username = $1", username)
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

func CheckUserExists(username string) (bool, error) {
	var count int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = $1", username).Scan(&count)
	if err != nil {
		log.Println("Error checking username existence:", err)
		return false, err
	}
	return count > 0, nil
}

func GetUser(username string, withEmails bool) (*models.User, error) {
	var user models.User
	err := db.DB.Get(&user, "SELECT id, username, password, password_reset_token, password_reset_token_used FROM users WHERE username = $1", username)
	if err != nil {
		return nil, err
	}

	if withEmails {
		var emails []models.Email
		err = db.DB.Select(&emails, "SELECT id, user_id, email, verified, verification_token FROM emails WHERE user_id = $1", user.ID)
		if err != nil {
			return nil, err
		}
		user.Emails = emails
	}

	return &user, nil
}

func StorePasswordResetToken(userID int, resetToken string) error {
	_, err := db.DB.Exec("UPDATE users SET password_reset_token = $1, password_reset_token_used = FALSE WHERE id = $2", resetToken, userID)
	return err
}
