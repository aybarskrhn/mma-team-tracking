-- Run this in your Supabase SQL editor
-- Go to: supabase.com → your project → SQL Editor → New query

-- Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assignee text not null check (assignee in ('Aybars', 'Maga', 'Moritz')),
  status text not null default 'todo' check (status in ('todo', 'inprogress', 'done')),
  deadline date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events table
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date date not null,
  time text,
  type text not null default 'other' check (type in ('team_meeting', 'milestone', 'prototype_day', 'deadline', 'other')),
  description text,
  created_at timestamptz default now()
);

-- Updates / progress feed
create table updates (
  id uuid default gen_random_uuid() primary key,
  author text not null check (author in ('Aybars', 'Maga', 'Moritz')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (but allow all for now — no auth needed)
alter table tasks enable row level security;
alter table events enable row level security;
alter table updates enable row level security;

create policy "Allow all on tasks" on tasks for all using (true) with check (true);
create policy "Allow all on events" on events for all using (true) with check (true);
create policy "Allow all on updates" on updates for all using (true) with check (true);

-- Seed: upcoming events from meeting notes
insert into events (title, date, time, type, description) values
  ('Idea Brainstorming & Selection', '2025-04-18', '12:00', 'team_meeting', 'Everyone prepares 3–5 new ideas with markets and use cases'),
  ('Check-in Meeting (tentative)', '2025-04-21', '15:00', 'team_meeting', 'To be confirmed'),
  ('Primary Market Research Kickoff', '2025-04-25', null, 'milestone', 'Interview outline + first user/expert conversations');

-- Seed: action items from last meeting
insert into tasks (title, assignee, status) values
  ('Begin initial prototype', 'Maga', 'todo'),
  ('Contact NVIDIA regarding collaboration/support', 'Aybars', 'todo'),
  ('Customer outreach emails for discovery calls', 'Moritz', 'todo'),
  ('Send Problem Statement & Idea Description drafts', 'Aybars', 'todo'),
  ('Prepare 3–5 new ideas with markets and use cases', 'Aybars', 'todo'),
  ('Prepare 3–5 new ideas with markets and use cases', 'Maga', 'todo'),
  ('Prepare 3–5 new ideas with markets and use cases', 'Moritz', 'todo');
