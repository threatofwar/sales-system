-- ==========================================
-- Customers Indexes
-- ==========================================

CREATE INDEX idx_customers_type
ON customers(type);

CREATE INDEX idx_customers_first_name
ON customers(first_name);

CREATE INDEX idx_customers_last_name
ON customers(last_name);

CREATE INDEX idx_customers_company_name
ON customers(company_name);

CREATE INDEX idx_customers_phone
ON customers(phone);

CREATE INDEX idx_customers_identification_no
ON customers(identification_no);

CREATE INDEX idx_customers_registration_no
ON customers(registration_no);



-- ==========================================
-- Customer Emails Indexes
-- ==========================================

CREATE INDEX idx_customer_emails_customer_id
ON customer_emails(customer_id);

CREATE INDEX idx_customer_emails_email
ON customer_emails(email);


-- Only allow one primary email per customer
CREATE UNIQUE INDEX idx_customer_primary_email
ON customer_emails(customer_id)
WHERE is_primary = TRUE;


-- ==========================================
-- Categories Indexes
-- ==========================================

-- Primary Key index created automatically.
-- UNIQUE(name) creates an index automatically.



-- ==========================================
-- Products Indexes
-- ==========================================

CREATE INDEX idx_products_category_id
ON products(category_id);

CREATE INDEX idx_products_name
ON products(name);


-- ==========================================
-- Stock Transactions Indexes
-- ==========================================
CREATE INDEX idx_stock_transactions_product_id
ON stock_transactions(product_id);


CREATE INDEX idx_stock_transactions_created_at
ON stock_transactions(created_at);

CREATE INDEX idx_stock_transactions_reference_type_id
ON stock_transactions(reference_type, reference_id);



-- ==========================================
-- Invoices Indexes
-- ==========================================

CREATE INDEX idx_invoices_customer_id
ON invoices(customer_id);

CREATE INDEX idx_invoices_invoice_date
ON invoices(invoice_date);

CREATE INDEX idx_invoices_status
ON invoices(status);



-- ==========================================
-- Invoice Items Indexes
-- ==========================================

CREATE INDEX idx_invoice_items_invoice_id
ON invoice_items(invoice_id);

CREATE INDEX idx_invoice_items_product_id
ON invoice_items(product_id);