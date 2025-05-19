-- Create profiles table
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    email text not null,
    balance decimal(10,2) not null default 10000.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

-- Create policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Create a policy for the trigger function
create policy "Trigger can insert profiles"
    on public.profiles for insert
    to authenticated
    with check (true);

-- Create function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, balance)
    values (new.id, new.email, 10000.00)
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger for new user signups
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 