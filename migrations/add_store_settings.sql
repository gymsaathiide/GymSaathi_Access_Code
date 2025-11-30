
-- Add store settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE UNIQUE,
  store_enabled INTEGER DEFAULT 1,
  show_out_of_stock INTEGER DEFAULT 0,
  default_tax_percent DECIMAL(5, 2) DEFAULT 0,
  allow_cash_payment INTEGER DEFAULT 1,
  allow_upi_payment INTEGER DEFAULT 1,
  allow_online_payment INTEGER DEFAULT 0,
  razorpay_key_id TEXT,
  razorpay_key_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
