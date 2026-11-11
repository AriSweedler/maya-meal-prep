-- Optional timings for a recipe, in minutes. Null means the source did not say.

alter table public.recipes
  add column prep_minutes integer check (prep_minutes is null or prep_minutes >= 0),
  add column cook_minutes integer check (cook_minutes is null or cook_minutes >= 0),
  add column total_minutes integer check (total_minutes is null or total_minutes >= 0);

drop function public.save_recipe(uuid, uuid, uuid, text, numeric, text, text, text, jsonb);

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
  p_ingredients jsonb,
  p_prep_minutes integer default null,
  p_cook_minutes integer default null,
  p_total_minutes integer default null
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
      source_type, source_url, prep_minutes, cook_minutes, total_minutes, created_by
    )
    values (
      p_project_id, p_collection_id, trim(p_title), p_servings,
      coalesce(p_instructions, ''), coalesce(p_source_type, 'manual'),
      nullif(trim(p_source_url), ''), p_prep_minutes, p_cook_minutes, p_total_minutes,
      (select auth.uid())
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
        prep_minutes = p_prep_minutes,
        cook_minutes = p_cook_minutes,
        total_minutes = p_total_minutes,
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

revoke execute on function public.save_recipe(
  uuid, uuid, uuid, text, numeric, text, text, text, jsonb, integer, integer, integer
) from public, anon;
grant execute on function public.save_recipe(
  uuid, uuid, uuid, text, numeric, text, text, text, jsonb, integer, integer, integer
) to authenticated;
