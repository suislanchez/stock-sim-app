-- Create pending_futures_orders table for storing limit orders that haven't been executed yet

CREATE TABLE IF NOT EXISTS pending_futures_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    contracts INTEGER NOT NULL,
    limit_price DECIMAL(10,2) NOT NULL,
    order_type VARCHAR(4) NOT NULL CHECK (order_type IN ('buy', 'sell')),
    margin DECIMAL(12,2) NOT NULL,
    expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS (Row Level Security) policy
ALTER TABLE pending_futures_orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own pending orders
CREATE POLICY "Users can view their own pending futures orders" ON pending_futures_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own pending orders
CREATE POLICY "Users can insert their own pending futures orders" ON pending_futures_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own pending orders
CREATE POLICY "Users can update their own pending futures orders" ON pending_futures_orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own pending orders
CREATE POLICY "Users can delete their own pending futures orders" ON pending_futures_orders
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_pending_futures_orders_user_id ON pending_futures_orders(user_id);
CREATE INDEX idx_pending_futures_orders_symbol ON pending_futures_orders(symbol);
CREATE INDEX idx_pending_futures_orders_created_at ON pending_futures_orders(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_pending_futures_orders_updated_at
    BEFORE UPDATE ON pending_futures_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 