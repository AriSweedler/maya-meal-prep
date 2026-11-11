-- A record of recipe imports that failed, for debugging the importer.
-- Members can add rows but not read them; read them from the dashboard:
--   select created_at, input, url, error, http_status from import_failures order by created_at desc;

create table public.import_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  -- Exactly what the user pasted.
  input text not null check (length(input) <= 4000),
  -- The link found in it, when there was one.
  url text check (url is null or length(url) <= 2000),
  error text not null check (length(error) <= 2000),
  -- The import function's HTTP status, when it answered.
  http_status integer
);

create index import_failures_created_at_idx on public.import_failures (created_at desc);

alter table public.import_failures enable row level security;

create policy import_failures_insert on public.import_failures
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.import_failures from anon, authenticated;
grant insert on public.import_failures to authenticated;
