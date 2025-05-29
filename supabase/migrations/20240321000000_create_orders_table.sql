-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    shares INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own orders
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own orders
CREATE POLICY "Users can insert their own orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id); 