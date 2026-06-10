-- schema.sql
-- Setup script for WeIntern AI Mock Interview Platform PostgreSQL Database in Supabase

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
-- Tracks user details synced from Supabase Auth
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for users
alter table public.users enable row level security;

-- 2. SESSIONS TABLE
-- Tracks individual mock interview sessions and overall evaluations
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  domain text not null, -- e.g., 'Software Engineering', 'Data Science', 'Marketing', 'Finance', 'HR/Management'
  difficulty text not null, -- e.g., 'Beginner', 'Intermediate', 'Advanced'
  communication_score integer not null, -- 0 to 10
  technical_score integer not null, -- 0 to 10
  confidence_score integer not null, -- 0 to 10
  overall_score integer not null, -- 0 to 100
  grade text not null, -- 'Excellent', 'Good', 'Needs Practice'
  strength text,
  improvement text,
  example_answer text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for sessions
alter table public.sessions enable row level security;

-- 3. SESSION ANSWERS TABLE
-- Tracks the list of questions, answers, and per-question info
create table if not exists public.session_answers (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions on delete cascade not null,
  question text not null,
  question_type text not null, -- 'Technical', 'Behavioral', 'Situational'
  user_answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for session_answers
alter table public.session_answers enable row level security;

-- RLS POLICIES

-- Users Policies:
-- Users can view their own profile data
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own profile data
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Sessions Policies:
-- Users can view their own sessions
create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

-- Users can insert their own sessions
create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

-- Session Answers Policies:
-- Users can view answers for their own sessions
create policy "Users can view answers for their own sessions"
  on public.session_answers for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_answers.session_id
      and sessions.user_id = auth.uid()
    )
  );

-- Users can insert answers for their own sessions
create policy "Users can insert answers for their own sessions"
  on public.session_answers for insert
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = session_answers.session_id
      and sessions.user_id = auth.uid()
    )
  );

-- AUTH TRIGGER SYNC
-- Automatically syncs authenticated users from Supabase Auth to public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    new.created_at
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute trigger function when a user registers or logs in via Google/OAuth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
