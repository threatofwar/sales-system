package services

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"go-login-restapi/pkg/db"
)

// A consignment moves stock to a customer without treating it as a sale.
// It is settled once all sent quantities have been sold, returned, or written off.
type ConsignmentItemInput struct {
	ProductID      int64   `json:"product_id"`
	Quantity       int     `json:"quantity"`
	UnitPrice      string  `json:"unit_price"`
	CommissionRate *string `json:"commission_rate,omitempty"`
}

type CreateConsignmentInput struct {
	CustomerID      int64                  `json:"customer_id"`
	ConsignmentDate string                 `json:"consignment_date,omitempty"`
	CommissionRate  string                 `json:"commission_rate,omitempty"`
	Notes           *string                `json:"notes,omitempty"`
	Items           []ConsignmentItemInput `json:"items"`
}

type SettlementItemInput struct {
	ItemID           int64 `json:"item_id"`
	QuantitySold     int   `json:"quantity_sold"`
	QuantityReturned int   `json:"quantity_returned"`
	QuantityDamaged  int   `json:"quantity_damaged"`
}

type SettleConsignmentInput struct {
	Items         []SettlementItemInput `json:"items"`
	PaymentAmount string                `json:"payment_amount,omitempty"`
	PaymentMethod string                `json:"payment_method,omitempty"`
	PaymentDate   *time.Time            `json:"payment_date,omitempty"`
	ReferenceNo   *string               `json:"reference_no,omitempty"`
	Notes         *string               `json:"notes,omitempty"`
}

type ConsignmentItem struct {
	ID               int64  `db:"id" json:"id"`
	ProductID        int64  `db:"product_id" json:"product_id"`
	ProductName      string `db:"product_name" json:"product_name"`
	QuantitySent     int    `db:"quantity_sent" json:"quantity_sent"`
	QuantitySold     int    `db:"quantity_sold" json:"quantity_sold"`
	QuantityReturned int    `db:"quantity_returned" json:"quantity_returned"`
	QuantityDamaged  int    `db:"quantity_damaged" json:"quantity_damaged"`
	UnitPrice        string `db:"unit_price" json:"unit_price"`
	CommissionRate   string `db:"commission_rate" json:"commission_rate"`
}

type Consignment struct {
	ID                int64             `db:"id" json:"id"`
	CustomerID        int64             `db:"customer_id" json:"customer_id"`
	CustomerName      string            `db:"customer_name" json:"customer_name"`
	ConsignmentNumber string            `db:"consignment_number" json:"consignment_number"`
	ConsignmentDate   time.Time         `db:"consignment_date" json:"consignment_date"`
	CommissionRate    string            `db:"commission_rate" json:"commission_rate"`
	Status            string            `db:"status" json:"status"`
	Notes             *string           `db:"notes" json:"notes,omitempty"`
	SettledAt         *time.Time        `db:"settled_at" json:"settled_at,omitempty"`
	Items             []ConsignmentItem `json:"items"`
}

func CreateConsignment(input *CreateConsignmentInput) (*Consignment, error) {
	if input == nil || input.CustomerID <= 0 || len(input.Items) == 0 {
		return nil, fmt.Errorf("customer and at least one item are required")
	}
	commission, err := consignmentRate(input.CommissionRate)
	if err != nil {
		return nil, err
	}
	date := time.Now()
	if strings.TrimSpace(input.ConsignmentDate) != "" {
		parsedDate, parseErr := time.Parse("2006-01-02", input.ConsignmentDate)
		if parseErr != nil {
			return nil, fmt.Errorf("consignment date must use YYYY-MM-DD")
		}
		date = parsedDate
	}
	tx, err := db.DB.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var customerExists bool
	if err := tx.Get(&customerExists, "SELECT EXISTS(SELECT 1 FROM customers WHERE id = $1)", input.CustomerID); err != nil || !customerExists {
		return nil, fmt.Errorf("customer not found")
	}
	number := fmt.Sprintf("CON-%s", time.Now().Format("20060102150405.000000000"))
	var id int64
	err = tx.Get(&id, `INSERT INTO consignments (customer_id, consignment_number, consignment_date, commission_rate, notes)
		VALUES ($1,$2,$3,$4,$5) RETURNING id`, input.CustomerID, number, date, commission.StringFixed(2), cleanOptionalString(input.Notes))
	if err != nil {
		return nil, err
	}

	for _, item := range input.Items {
		if item.ProductID <= 0 || item.Quantity <= 0 {
			return nil, fmt.Errorf("each item needs a product and positive quantity")
		}
		price, err := positiveConsignmentMoney(item.UnitPrice, "unit price")
		if err != nil {
			return nil, err
		}
		itemRate := commission
		if item.CommissionRate != nil {
			itemRate, err = consignmentRate(*item.CommissionRate)
			if err != nil {
				return nil, err
			}
		}
		var stock int
		if err := tx.Get(&stock, "SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE", item.ProductID); err != nil {
			return nil, fmt.Errorf("product %d not found", item.ProductID)
		}
		if stock < item.Quantity {
			return nil, fmt.Errorf("insufficient stock for product %d", item.ProductID)
		}
		if _, err := tx.Exec("UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", item.Quantity, item.ProductID); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`INSERT INTO consignment_items (consignment_id, product_id, quantity_sent, unit_price, commission_rate)
			VALUES ($1,$2,$3,$4,$5)`, id, item.ProductID, item.Quantity, price.StringFixed(2), itemRate.StringFixed(2)); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_type, reference_id, notes)
			VALUES ($1, 'CONSIGNMENT_OUT', $2, 'CONSIGNMENT', $3, 'Sent on consignment')`, item.ProductID, item.Quantity, id); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetConsignmentByID(id)
}

func GetConsignments() ([]Consignment, error) {
	var consignments []Consignment
	err := db.DB.Select(&consignments, `SELECT c.id,c.customer_id,COALESCE(cu.company_name, CONCAT_WS(' ',cu.first_name,cu.last_name)) customer_name,
		c.consignment_number,c.consignment_date,c.commission_rate,c.status,c.notes,c.settled_at
		FROM consignments c JOIN customers cu ON cu.id=c.customer_id ORDER BY c.created_at DESC`)
	if err != nil {
		return nil, err
	}
	if consignments == nil {
		consignments = []Consignment{}
	}
	return consignments, nil
}

func GetConsignmentByID(id int64) (*Consignment, error) {
	var c Consignment
	err := db.DB.Get(&c, `SELECT c.id,c.customer_id,COALESCE(cu.company_name, CONCAT_WS(' ',cu.first_name,cu.last_name)) customer_name,
		c.consignment_number,c.consignment_date,c.commission_rate,c.status,c.notes,c.settled_at
		FROM consignments c JOIN customers cu ON cu.id=c.customer_id WHERE c.id=$1`, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("consignment not found")
		}
		return nil, err
	}
	err = db.DB.Select(&c.Items, `SELECT ci.id,ci.product_id,p.name product_name,ci.quantity_sent,ci.quantity_sold,ci.quantity_returned,ci.quantity_damaged,ci.unit_price,ci.commission_rate
		FROM consignment_items ci JOIN products p ON p.id=ci.product_id WHERE ci.consignment_id=$1 ORDER BY ci.id`, id)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func SettleConsignment(id int64, input *SettleConsignmentInput) (map[string]any, error) {
	if input == nil || len(input.Items) == 0 {
		return nil, fmt.Errorf("settlement items are required")
	}
	tx, err := db.DB.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var header struct {
		CustomerID int64  `db:"customer_id"`
		Status     string `db:"status"`
	}
	if err := tx.Get(&header, "SELECT customer_id,status FROM consignments WHERE id=$1 FOR UPDATE", id); err != nil {
		return nil, fmt.Errorf("consignment not found")
	}
	if header.Status != "OPEN" {
		return nil, fmt.Errorf("only an open consignment can be settled")
	}
	var gross, commission decimal.Decimal
	for _, settlement := range input.Items {
		var item struct {
			ProductID int64  `db:"product_id"`
			Sent      int    `db:"quantity_sent"`
			Price     string `db:"unit_price"`
			Rate      string `db:"commission_rate"`
		}
		if err := tx.Get(&item, "SELECT product_id,quantity_sent,unit_price,commission_rate FROM consignment_items WHERE id=$1 AND consignment_id=$2 FOR UPDATE", settlement.ItemID, id); err != nil {
			return nil, fmt.Errorf("invalid settlement item")
		}
		if settlement.QuantitySold < 0 || settlement.QuantityReturned < 0 || settlement.QuantityDamaged < 0 || settlement.QuantitySold+settlement.QuantityReturned+settlement.QuantityDamaged != item.Sent {
			return nil, fmt.Errorf("sold, returned, and damaged quantities must equal quantity sent")
		}
		price, _ := decimal.NewFromString(item.Price)
		rate, _ := decimal.NewFromString(item.Rate)
		lineGross := price.Mul(decimal.NewFromInt(int64(settlement.QuantitySold)))
		gross = gross.Add(lineGross)
		commission = commission.Add(lineGross.Mul(rate).Div(decimal.NewFromInt(100)))
		if _, err := tx.Exec(`UPDATE consignment_items SET quantity_sold=$1,quantity_returned=$2,quantity_damaged=$3 WHERE id=$4`, settlement.QuantitySold, settlement.QuantityReturned, settlement.QuantityDamaged, settlement.ItemID); err != nil {
			return nil, err
		}
		if settlement.QuantityReturned > 0 {
			if _, err := tx.Exec("UPDATE products SET stock_quantity=stock_quantity+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2", settlement.QuantityReturned, item.ProductID); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(`INSERT INTO stock_transactions (product_id,transaction_type,quantity,reference_type,reference_id,notes) VALUES ($1,'CONSIGNMENT_RETURN',$2,'CONSIGNMENT',$3,'Returned from consignment')`, item.ProductID, settlement.QuantityReturned, id); err != nil {
				return nil, err
			}
		}
	}
	net := gross.Sub(commission)
	invoiceNumber := fmt.Sprintf("CON-INV-%s", time.Now().Format("20060102150405.000000000"))
	status := "ISSUED"
	payment := decimal.Zero
	if strings.TrimSpace(input.PaymentAmount) != "" {
		payment, err = positiveConsignmentMoney(input.PaymentAmount, "payment amount")
		if err != nil {
			return nil, err
		}
		if payment.GreaterThan(net) {
			return nil, fmt.Errorf("payment cannot exceed amount payable")
		}
		if payment.Equal(net) {
			status = "PAID"
		} else {
			status = "PARTIAL"
		}
	}
	var invoiceID int64
	if err := tx.Get(&invoiceID, `INSERT INTO invoices (customer_id,invoice_number,invoice_date,status,subtotal,discount,tax,total,notes)
		VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,0,$6,$7) RETURNING id`, header.CustomerID, invoiceNumber, status, gross.StringFixed(2), commission.StringFixed(2), net.StringFixed(2), cleanOptionalString(input.Notes)); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO invoice_items (invoice_id,product_id,quantity,unit_price,discount,total)
		SELECT $1,product_id,quantity_sold,unit_price,0,unit_price*quantity_sold FROM consignment_items WHERE consignment_id=$2 AND quantity_sold>0`, invoiceID, id); err != nil {
		return nil, err
	}
	if payment.GreaterThan(decimal.Zero) {
		method := strings.ToUpper(strings.TrimSpace(input.PaymentMethod))
		if method == "" {
			return nil, fmt.Errorf("payment method is required when recording a payment")
		}
		date := time.Now()
		if input.PaymentDate != nil {
			date = *input.PaymentDate
		}
		if _, err := tx.Exec(`INSERT INTO payments (invoice_id,amount,payment_method,payment_date,reference_no,notes) VALUES ($1,$2,$3,$4,$5,$6)`, invoiceID, payment.StringFixed(2), method, date, cleanOptionalString(input.ReferenceNo), cleanOptionalString(input.Notes)); err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec("UPDATE consignments SET status='SETTLED',settled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1", id); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]any{"invoice_id": invoiceID, "invoice_number": invoiceNumber, "gross_sales": gross.StringFixed(2), "commission": commission.StringFixed(2), "amount_payable": net.StringFixed(2), "status": status}, nil
}

func consignmentRate(value string) (decimal.Decimal, error) {
	if strings.TrimSpace(value) == "" {
		return decimal.Zero, nil
	}
	rate, err := decimal.NewFromString(value)
	if err != nil || rate.IsNegative() || rate.GreaterThan(decimal.NewFromInt(100)) {
		return decimal.Zero, fmt.Errorf("commission rate must be between 0 and 100")
	}
	return rate, nil
}
func positiveConsignmentMoney(value, label string) (decimal.Decimal, error) {
	amount, err := decimal.NewFromString(strings.TrimSpace(value))
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		return decimal.Zero, fmt.Errorf("%s must be greater than zero", label)
	}
	return amount, nil
}
