-- Add eligibility rule fields to discounts table
-- These fields come from the v2 discounts API with includeInclusionExclusionData=true

-- Calculation method (e.g., PRICE_TO_AMOUNT_TOTAL, PERCENT_OFF, PRICE_TO_AMOUNT)
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(100);

-- Threshold fields (for bundle deals like "Buy 3 for $50")
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS threshold_min INTEGER;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS threshold_max INTEGER;

-- Bundle discount flag
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS is_bundled_discount BOOLEAN DEFAULT false;

-- Apply to only one item flag
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS apply_to_only_one_item BOOLEAN DEFAULT false;

-- Online display name (from onlineName field)
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS online_name VARCHAR(500);

-- Menu display fields
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS menu_display JSONB;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS menu_display_name VARCHAR(500);
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS menu_display_image_url TEXT;

-- Constraints array (for bundled discounts)
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS constraints JSONB;

-- Weekly schedule individual fields
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS monday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS tuesday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS wednesday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS thursday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS friday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS saturday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS sunday BOOLEAN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS end_time TIME;

-- Create index on calculation_method for filtering
CREATE INDEX IF NOT EXISTS idx_discounts_calculation_method ON discounts(calculation_method);

-- Create index on threshold_min for bundle deal queries
CREATE INDEX IF NOT EXISTS idx_discounts_threshold_min ON discounts(threshold_min);
