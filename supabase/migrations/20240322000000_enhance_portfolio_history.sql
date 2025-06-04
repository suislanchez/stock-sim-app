-- Enhanced Portfolio History Migration
-- This migration enhances the existing portfolio_history table with additional functionality

-- Ensure we have all the necessary columns (some may already exist)
DO $$ 
BEGIN
    -- Add daily_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'portfolio_history' AND column_name = 'daily_value') THEN
        ALTER TABLE portfolio_history ADD COLUMN daily_value DECIMAL(20, 2);
    END IF;

    -- Add market_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'portfolio_history' AND column_name = 'market_value') THEN
        ALTER TABLE portfolio_history ADD COLUMN market_value DECIMAL(20, 2);
    END IF;

    -- Add cash_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'portfolio_history' AND column_name = 'cash_balance') THEN
        ALTER TABLE portfolio_history ADD COLUMN cash_balance DECIMAL(20, 2);
    END IF;

    -- Add date_only column for unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'portfolio_history' AND column_name = 'date_only') THEN
        ALTER TABLE portfolio_history ADD COLUMN date_only DATE;
    END IF;
END $$;

-- Update existing rows to populate date_only column
UPDATE portfolio_history SET date_only = DATE(created_at) WHERE date_only IS NULL;

-- Create function to get portfolio performance data
CREATE OR REPLACE FUNCTION get_portfolio_performance(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date TIMESTAMP WITH TIME ZONE,
    total_value DECIMAL(20, 2),
    daily_return DECIMAL(10, 2),
    total_return DECIMAL(10, 2),
    market_value DECIMAL(20, 2),
    cash_balance DECIMAL(20, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.created_at AS date,
        ph.total_value,
        ph.daily_return,
        ph.total_return,
        COALESCE(ph.market_value, 0) AS market_value,
        COALESCE(ph.cash_balance, 0) AS cash_balance
    FROM portfolio_history ph
    WHERE ph.user_id = p_user_id
        AND ph.created_at >= NOW() - INTERVAL '1 day' * p_days
    ORDER BY ph.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to record daily portfolio snapshot
CREATE OR REPLACE FUNCTION record_portfolio_snapshot(p_user_id UUID)
RETURNS void AS $$
DECLARE
    user_balance DECIMAL(20, 2);
    portfolio_market_value DECIMAL(20, 2);
    total_portfolio_value DECIMAL(20, 2);
    prev_value DECIMAL(20, 2);
    daily_return DECIMAL(10, 2);
    total_return DECIMAL(10, 2);
    initial_value DECIMAL(20, 2);
    today_date DATE;
BEGIN
    today_date := CURRENT_DATE;
    
    -- Get user's current balance
    SELECT COALESCE(balance, 0) INTO user_balance
    FROM profiles
    WHERE id = p_user_id;

    -- Calculate current market value of portfolio
    SELECT COALESCE(SUM(shares * average_price), 0) INTO portfolio_market_value
    FROM portfolio
    WHERE user_id = p_user_id;

    -- Calculate total portfolio value
    total_portfolio_value := COALESCE(user_balance, 0) + COALESCE(portfolio_market_value, 0);

    -- Get previous day's value for daily return calculation
    SELECT ph.total_value INTO prev_value
    FROM portfolio_history ph
    WHERE ph.user_id = p_user_id
        AND ph.date_only = today_date - INTERVAL '1 day'
    ORDER BY ph.created_at DESC
    LIMIT 1;

    -- Get initial value for total return calculation
    SELECT ph.total_value INTO initial_value
    FROM portfolio_history ph
    WHERE ph.user_id = p_user_id
    ORDER BY ph.created_at ASC
    LIMIT 1;

    -- Calculate returns
    IF prev_value IS NULL OR prev_value = 0 THEN
        daily_return := 0;
    ELSE
        daily_return := ((total_portfolio_value - prev_value) / prev_value) * 100;
    END IF;

    IF initial_value IS NULL OR initial_value = 0 THEN
        total_return := 0;
    ELSE
        total_return := ((total_portfolio_value - initial_value) / initial_value) * 100;
    END IF;

    -- Insert today's snapshot (only if one doesn't exist for today)
    INSERT INTO portfolio_history (
        user_id,
        total_value,
        daily_return,
        total_return,
        market_value,
        cash_balance,
        date_only,
        created_at
    )
    VALUES (
        p_user_id,
        total_portfolio_value,
        daily_return,
        total_return,
        portfolio_market_value,
        user_balance,
        today_date,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, date_only) DO UPDATE SET
        total_value = EXCLUDED.total_value,
        daily_return = EXCLUDED.daily_return,
        total_return = EXCLUDED.total_return,
        market_value = EXCLUDED.market_value,
        cash_balance = EXCLUDED.cash_balance,
        created_at = EXCLUDED.created_at;

END;
$$ LANGUAGE plpgsql;

-- Create unique constraint to prevent duplicate daily entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'portfolio_history_user_date_unique'
    ) THEN
        ALTER TABLE portfolio_history 
        ADD CONSTRAINT portfolio_history_user_date_unique 
        UNIQUE (user_id, date_only);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        -- Constraint already exists, ignore
        NULL;
END $$;

-- Create trigger to automatically populate date_only column
CREATE OR REPLACE FUNCTION set_date_only()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_only := DATE(NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create it
DROP TRIGGER IF EXISTS portfolio_history_set_date_only ON portfolio_history;
CREATE TRIGGER portfolio_history_set_date_only
    BEFORE INSERT OR UPDATE ON portfolio_history
    FOR EACH ROW
    EXECUTE FUNCTION set_date_only();

-- Create function to clean old portfolio history (keep last 365 days)
CREATE OR REPLACE FUNCTION cleanup_old_portfolio_history()
RETURNS void AS $$
BEGIN
    DELETE FROM portfolio_history
    WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for authenticated users
GRANT EXECUTE ON FUNCTION get_portfolio_performance(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION record_portfolio_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_portfolio_history() TO authenticated; 