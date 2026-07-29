create table if not exists public.questions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  area text not null,
  topic text not null,
  difficulty text not null default 'Média',
  tag text not null default 'Banco geral',
  question_text text not null,
  options jsonb not null,
  correct_answer integer not null,
  explanation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.questions
  add column if not exists tag text not null default 'Banco geral';

create table if not exists public.attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  area text not null,
  topic text not null,
  selected_answer integer not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists questions_user_id_idx on public.questions(user_id);
create index if not exists attempts_user_id_idx on public.attempts(user_id);
create index if not exists attempts_answered_at_idx on public.attempts(answered_at);
create index if not exists attempts_area_idx on public.attempts(area);

alter table public.questions enable row level security;
alter table public.attempts enable row level security;

create policy "Users read own questions"
  on public.questions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own questions"
  on public.questions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own questions"
  on public.questions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own questions"
  on public.questions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users read own attempts"
  on public.attempts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own attempts"
  on public.attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete own attempts"
  on public.attempts for delete to authenticated
  using ((select auth.uid()) = user_id);
