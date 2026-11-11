-- Maya Meal Prep: initial schema.
--
-- A project is a shared workspace. Its members share collections of recipes
-- and a weekly meal plan; the grocery list is derived from the plan in the
-- client. Every table is protected by row level security keyed on project
-- membership.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- projects

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- Anyone signed in who knows this code can join the project.
  invite_code text not null unique
    default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);

-- Security definer so policies on project_members can call it without
-- recursing into themselves.
create function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id = (select auth.uid())
  );
$$;

-- ------------------------------------------------------------- collections

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (id, project_id)
);

create index collections_project_id_idx on public.collections (project_id);

-- ----------------------------------------------------------------- recipes

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  collection_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  -- How many portions the ingredient quantities make.
  servings numeric not null default 1 check (servings > 0),
  instructions text not null default '',
  -- Where the recipe came from: typed in, a web page, an Instagram caption...
  source_type text not null default 'manual',
  source_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  -- A recipe's collection must be in the recipe's own project.
  foreign key (collection_id, project_id)
    references public.collections (id, project_id) on delete cascade
);

create index recipes_project_id_idx on public.recipes (project_id);
create index recipes_collection_id_idx on public.recipes (collection_id);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null default 0,
  name text not null check (length(trim(name)) > 0),
  -- Null quantity means "some": salt, oil for the pan.
  quantity numeric check (quantity is null or quantity >= 0),
  unit text
);

create index recipe_ingredients_recipe_id_idx
  on public.recipe_ingredients (recipe_id);

-- --------------------------------------------------------------- meal plan

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  plan_date date not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid not null,
  -- Portions to cook; the grocery list scales by servings / recipe.servings.
  servings numeric not null check (servings > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (recipe_id, project_id)
    references public.recipes (id, project_id) on delete cascade
);

create index meal_plan_entries_project_date_idx
  on public.meal_plan_entries (project_id, plan_date);

-- ------------------------------------------------------ row level security

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.collections enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plan_entries enable row level security;

-- You can see yourself and anyone you share a project with.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.project_members pm
      where pm.user_id = profiles.id
        and public.is_project_member(pm.project_id)
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Projects are created and joined through the functions below, so there is
-- no insert policy on projects or project_members.
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_project_member(id));

create policy projects_update on public.projects
  for update to authenticated
  using (public.is_project_member(id))
  with check (public.is_project_member(id));

create policy projects_delete on public.projects
  for delete to authenticated
  using (created_by = (select auth.uid()));

create policy project_members_select on public.project_members
  for select to authenticated
  using (public.is_project_member(project_id));

-- Leave a project.
create policy project_members_delete on public.project_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy collections_all on public.collections
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy recipes_all on public.recipes
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy recipe_ingredients_all on public.recipe_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_project_member(r.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_project_member(r.project_id)
    )
  );

create policy meal_plan_entries_all on public.meal_plan_entries
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- --------------------------------------------------------------- functions

create function public.create_project(p_name text)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_project public.projects;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  insert into public.projects (name, created_by)
  values (trim(p_name), v_user)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, v_user, 'owner');

  insert into public.collections (project_id, name)
  values (v_project.id, 'Recipes');

  return v_project;
end;
$$;

create function public.join_project(p_invite_code text)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_project public.projects;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  select * into v_project
  from public.projects
  where invite_code = trim(p_invite_code);

  if not found then
    raise exception 'No project has that invite code';
  end if;

  insert into public.project_members (project_id, user_id)
  values (v_project.id, v_user)
  on conflict do nothing;

  return v_project;
end;
$$;

-- Create or replace a recipe and its ingredient list in one transaction.
-- Runs as the caller, so row level security applies.
create function public.save_recipe(
  p_recipe_id uuid,
  p_project_id uuid,
  p_collection_id uuid,
  p_title text,
  p_servings numeric,
  p_instructions text,
  p_source_type text,
  p_source_url text,
  p_ingredients jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_recipe_id;
begin
  if v_id is null then
    insert into public.recipes (
      project_id, collection_id, title, servings, instructions,
      source_type, source_url, created_by
    )
    values (
      p_project_id, p_collection_id, trim(p_title), p_servings,
      coalesce(p_instructions, ''), coalesce(p_source_type, 'manual'),
      nullif(trim(p_source_url), ''), (select auth.uid())
    )
    returning id into v_id;
  else
    update public.recipes
    set collection_id = p_collection_id,
        title = trim(p_title),
        servings = p_servings,
        instructions = coalesce(p_instructions, ''),
        source_type = coalesce(p_source_type, 'manual'),
        source_url = nullif(trim(p_source_url), ''),
        updated_at = now()
    where id = v_id and project_id = p_project_id;

    if not found then
      raise exception 'Recipe not found';
    end if;

    delete from public.recipe_ingredients where recipe_id = v_id;
  end if;

  insert into public.recipe_ingredients (recipe_id, position, name, quantity, unit)
  select
    v_id,
    (item.ordinality - 1)::integer,
    trim(item.value ->> 'name'),
    (item.value ->> 'quantity')::numeric,
    nullif(trim(item.value ->> 'unit'), '')
  from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb))
    with ordinality as item (value, ordinality);

  return v_id;
end;
$$;

-- ------------------------------------------------------------------ grants

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.create_project(text) to authenticated;
grant execute on function public.join_project(text) to authenticated;
grant execute on function public.save_recipe(
  uuid, uuid, uuid, text, numeric, text, text, text, jsonb
) to authenticated;

-- ---------------------------------------------------------------- realtime

-- Members see each other's edits live.
alter publication supabase_realtime add table
  public.collections,
  public.recipes,
  public.meal_plan_entries;
