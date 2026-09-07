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

drop policy if exists "Users read own questions" on public.questions;
drop policy if exists "Users insert own questions" on public.questions;
drop policy if exists "Users update own questions" on public.questions;
drop policy if exists "Users delete own questions" on public.questions;
drop policy if exists "Users read own attempts" on public.attempts;
drop policy if exists "Users insert own attempts" on public.attempts;
drop policy if exists "Users update own attempts" on public.attempts;
drop policy if exists "Users delete own attempts" on public.attempts;

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

create policy "Users update own attempts"
  on public.attempts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own attempts"
  on public.attempts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Dados das demais abas. Cada registro pertence exclusivamente à conta autenticada.
create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  data_key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, data_key)
);

create index if not exists user_data_user_id_idx on public.user_data(user_id);
alter table public.user_data enable row level security;

drop policy if exists "Users read own app data" on public.user_data;
drop policy if exists "Users insert own app data" on public.user_data;
drop policy if exists "Users update own app data" on public.user_data;
drop policy if exists "Users delete own app data" on public.user_data;

create policy "Users read own app data" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own app data" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own app data" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete own app data" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Metadados da biblioteca multimídia; os arquivos ficam no Supabase Storage.
create table if not exists public.library_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  area text,
  description text,
  file_name text,
  mime_type text,
  size bigint,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists library_items_user_id_idx on public.library_items(user_id);
alter table public.library_items enable row level security;

drop policy if exists "Users read own library" on public.library_items;
drop policy if exists "Users insert own library" on public.library_items;
drop policy if exists "Users update own library" on public.library_items;
drop policy if exists "Users delete own library" on public.library_items;

create policy "Users read own library" on public.library_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own library" on public.library_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own library" on public.library_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete own library" on public.library_items
  for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library-images',
  'library-images',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mpeg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own library files" on storage.objects;
drop policy if exists "Users insert own library files" on storage.objects;
drop policy if exists "Users update own library files" on storage.objects;
drop policy if exists "Users delete own library files" on storage.objects;

create policy "Users read own library files" on storage.objects
  for select to authenticated
  using (bucket_id = 'library-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users insert own library files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own library files" on storage.objects
  for update to authenticated
  using (bucket_id = 'library-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'library-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own library files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'library-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
