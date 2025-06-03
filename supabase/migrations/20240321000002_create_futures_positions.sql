-- Create futures_positions table
CREATE TABLE IF NOT EXISTS public.futures_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    contracts INTEGER NOT NULL CHECK (contracts != 0), -- Allow negative for short positions
    entry_price DECIMAL(10,2) NOT NULL CHECK (entry_price > 0),
    margin DECIMAL(10,2) NOT NULL CHECK (margin > 0),
    expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own futures positions"
    ON public.futures_positions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own futures positions"
    ON public.futures_positions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- Create futures_positions table
CREATE TABLE IF NOT EXISTS public.futures_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    contracts INTEGER NOT NULL CHECK (contracts != 0), -- Allow negative for short positions
    entry_price DECIMAL(10,2) NOT NULL CHECK (entry_price > 0),
    margin DECIMAL(10,2) NOT NULL CHECK (margin > 0),
    expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own futures positions"
    ON public.futures_positions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own futures positions"
    ON public.futures_positions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own futures positions"
    ON public.futures_positions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 

CREATE POLICY "Users can delete their own futures positions"
    ON public.futures_positions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_futures_positions_updated_at
    BEFORE UPDATE ON public.futures_positions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS futures_positions_user_id_idx ON public.futures_positions(user_id);
CREATE INDEX IF NOT EXISTS futures_positions_symbol_idx ON public.futures_positions(symbol);
CREATE INDEX IF NOT EXISTS futures_positions_expiry_idx ON public.futures_positions(expiry); 
CREATE POLICY "Users can update their own futures positions"
    ON public.futures_positions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 

CREATE POLICY "Users can delete their own futures positions"
    ON public.futures_positions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_futures_positions_updated_at
    BEFORE UPDATE ON public.futures_positions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS futures_positions_user_id_idx ON public.futures_positions(user_id);
CREATE INDEX IF NOT EXISTS futures_positions_symbol_idx ON public.futures_positions(symbol);
CREATE INDEX IF NOT EXISTS futures_positions_expiry_idx ON public.futures_positions(expiry); 