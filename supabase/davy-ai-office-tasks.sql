-- Davy AI Office task synchronization
-- Run this SQL in Supabase SQL Editor for the project chosen for Davy Analytics.
create table if not exists public.davy_ai_office_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  title text not null,
  agent text not null,
  description text not null default '',
  status text not null default 'Menunggu'
    check (status in ('Menunggu', 'Berjalan', 'Selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.davy_ai_office_tasks enable row level security;

grant select, insert, update, delete on public.davy_ai_office_tasks to authenticated;

drop policy if exists "Users read own Davy AI Office tasks" on public.davy_ai_office_tasks;
create policy "Users read own Davy AI Office tasks"
on public.davy_ai_office_tasks for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own Davy AI Office tasks" on public.davy_ai_office_tasks;
create policy "Users insert own Davy AI Office tasks"
on public.davy_ai_office_tasks for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own Davy AI Office tasks" on public.davy_ai_office_tasks;
create policy "Users update own Davy AI Office tasks"
on public.davy_ai_office_tasks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own Davy AI Office tasks" on public.davy_ai_office_tasks;
create policy "Users delete own Davy AI Office tasks"
on public.davy_ai_office_tasks for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists davy_ai_office_tasks_user_updated_idx
on public.davy_ai_office_tasks (user_id, updated_at desc);
