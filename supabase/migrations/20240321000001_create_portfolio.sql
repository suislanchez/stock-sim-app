-- Create portfolio table
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    shares INTEGER NOT NULL CHECK (shares > 0),
    average_price DECIMAL(10,2) NOT NULL CHECK (average_price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, symbol)
);

-- Enable Row Level Security
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own portfolio"
    ON public.portfolio
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio items"
    ON public.portfolio
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio items"
    ON public.portfolio
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio items"
    ON public.portfolio
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_portfolio_updated_at
    BEFORE UPDATE ON public.portfolio
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 