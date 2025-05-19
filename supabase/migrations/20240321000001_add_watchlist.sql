-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, symbol)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS watchlist_symbol_idx ON watchlist(symbol);

-- Add RLS policies
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to read their own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Allow users to insert into their own watchlist" ON watchlist;
DROP POLICY IF EXISTS "Allow users to delete from their own watchlist" ON watchlist;

-- Allow users to read their own watchlist
CREATE POLICY "Allow users to read their own watchlist"
    ON watchlist FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert into their own watchlist
CREATE POLICY "Allow users to insert into their own watchlist"
    ON watchlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete from their own watchlist
CREATE POLICY "Allow users to delete from their own watchlist"
    ON watchlist FOR DELETE
    USING (auth.uid() = user_id); 