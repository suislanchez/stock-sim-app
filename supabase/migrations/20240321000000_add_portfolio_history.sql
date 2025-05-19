-- Create portfolio_history table
CREATE TABLE IF NOT EXISTS portfolio_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_value DECIMAL(20, 2) NOT NULL,
    daily_return DECIMAL(10, 2) NOT NULL,
    total_return DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS portfolio_history_user_id_idx ON portfolio_history(user_id);
CREATE INDEX IF NOT EXISTS portfolio_history_created_at_idx ON portfolio_history(created_at);

-- Add RLS policies
ALTER TABLE portfolio_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to read all portfolio history" ON portfolio_history;
DROP POLICY IF EXISTS "Allow users to insert their own portfolio history" ON portfolio_history;

-- Allow users to read all history (needed for leaderboard)
CREATE POLICY "Allow users to read all portfolio history"
    ON portfolio_history FOR SELECT
    USING (true);

-- Allow users to insert their own history
CREATE POLICY "Allow users to insert their own portfolio history"
    ON portfolio_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create function to calculate total value
CREATE OR REPLACE FUNCTION calculate_total_value(p_user_id UUID)
RETURNS DECIMAL(20, 2) AS $$
DECLARE
    user_balance DECIMAL(20, 2);
    portfolio_value DECIMAL(20, 2);
BEGIN
    -- Get user's balance
    SELECT COALESCE(balance, 0) INTO user_balance
    FROM profiles
    WHERE id = p_user_id;

    -- Calculate portfolio value
    SELECT COALESCE(SUM(shares * average_price), 0) INTO portfolio_value
    FROM portfolio
    WHERE portfolio.user_id = p_user_id;

    RETURN COALESCE(user_balance, 0) + COALESCE(portfolio_value, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to update portfolio history
CREATE OR REPLACE FUNCTION update_portfolio_history()
RETURNS TRIGGER AS $$
DECLARE
    prev_value DECIMAL(20, 2);
    daily_return DECIMAL(10, 2);
    total_return DECIMAL(10, 2);
    current_total_value DECIMAL(20, 2);
    p_user_id UUID;
BEGIN
    -- Get the user_id based on which table triggered the function
    IF TG_TABLE_NAME = 'portfolio' THEN
        p_user_id := NEW.user_id;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
        p_user_id := NEW.id;
    END IF;

    -- Calculate total value
    current_total_value := calculate_total_value(p_user_id);

    -- Get previous day's value
    SELECT ph.total_value INTO prev_value
    FROM portfolio_history ph
    WHERE ph.user_id = p_user_id
    ORDER BY ph.created_at DESC
    LIMIT 1;

    -- Calculate returns
    IF prev_value IS NULL THEN
        daily_return := 0;
        total_return := 0;
    ELSE
        daily_return := ((current_total_value - prev_value) / prev_value) * 100;
        
        -- Get initial value (first record)
        SELECT ph.total_value INTO prev_value
        FROM portfolio_history ph
        WHERE ph.user_id = p_user_id
        ORDER BY ph.created_at ASC
        LIMIT 1;
        
        total_return := ((current_total_value - prev_value) / prev_value) * 100;
    END IF;

    -- Insert new history record
    INSERT INTO portfolio_history (user_id, total_value, daily_return, total_return)
    VALUES (p_user_id, current_total_value, daily_return, total_return);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_portfolio_history_trigger ON portfolio;
DROP TRIGGER IF EXISTS update_portfolio_history_balance_trigger ON profiles;

-- Create triggers for portfolio changes
CREATE TRIGGER update_portfolio_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON portfolio
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_history();

-- Create trigger for balance changes
CREATE TRIGGER update_portfolio_history_balance_trigger
    AFTER UPDATE OF balance ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_portfolio_history();

-- Create trigger for new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial portfolio history record for new user
    INSERT INTO portfolio_history (
        user_id,
        total_value,
        daily_return,
        total_return
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.balance, 0),
        0,
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
CREATE TRIGGER handle_new_user_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to populate initial data
CREATE OR REPLACE FUNCTION populate_initial_portfolio_history()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- First, clear any existing data
    DELETE FROM portfolio_history;
    
    -- Then populate for all users
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Insert initial record for each user
        INSERT INTO portfolio_history (
            user_id,
            total_value,
            daily_return,
            total_return
        )
        VALUES (
            user_record.id,
            calculate_total_value(user_record.id),
            0,
            0
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute initial population
SELECT populate_initial_portfolio_history(); 