-- Every recipe keeps a full schema.org Recipe document (https://schema.org/Recipe).
-- It is the record of the recipe: an imported recipe keeps everything its page
-- published, and a typed recipe is written in the same shape. The other columns
-- and recipe_ingredients are derived from it for querying and the grocery list.

alter table public.recipes
  add column schema_org jsonb check (jsonb_typeof(schema_org) = 'object');

-- Write the recipes that exist already in schema.org form.
update public.recipes r
set schema_org = jsonb_strip_nulls(jsonb_build_object(
  '@context', 'https://schema.org',
  '@type', 'Recipe',
  'name', r.title,
  'recipeYield', trim_scale(r.servings)::text || ' servings',
  'recipeIngredient', coalesce((
    select jsonb_agg(
      concat_ws(' ', trim_scale(i.quantity)::text, i.unit, i.name)
      order by i.position
    )
    from public.recipe_ingredients i
    where i.recipe_id = r.id
  ), '[]'::jsonb),
  'recipeInstructions', coalesce((
    select jsonb_agg(
      jsonb_build_object('@type', 'HowToStep', 'text', regexp_replace(step, '^\d+\.\s*', ''))
      order by ordinality
    )
    from regexp_split_to_table(r.instructions, '\n+') with ordinality as steps (step, ordinality)
    where trim(step) <> ''
  ), '[]'::jsonb),
  'prepTime', 'PT' || r.prep_minutes || 'M',
  'cookTime', 'PT' || r.cook_minutes || 'M',
  'totalTime', 'PT' || r.total_minutes || 'M',
  'url', r.source_url
));

alter table public.recipes alter column schema_org set not null;

drop function public.save_recipe(
  uuid, uuid, uuid, text, numeric, text, text, text, jsonb, integer, integer, integer
);

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
  p_schema_org jsonb,
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
      project_id, collection_id, title, servings, instructions, source_type, source_url,
      prep_minutes, cook_minutes, total_minutes, schema_org, created_by
    )
    values (
      p_project_id, p_collection_id, trim(p_title), p_servings,
      coalesce(p_instructions, ''), coalesce(p_source_type, 'manual'),
      nullif(trim(p_source_url), ''), p_prep_minutes, p_cook_minutes, p_total_minutes,
      p_schema_org, (select auth.uid())
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
        schema_org = p_schema_org,
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
  uuid, uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, integer, integer, integer
) from public, anon;
grant execute on function public.save_recipe(
  uuid, uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, integer, integer, integer
) to authenticated;
