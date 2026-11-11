import type { Tables } from './database.types'
import type { IngredientInput } from './ingredients'
import { supabase } from './supabase'

export type Project = Tables<'projects'>
export type Collection = Tables<'collections'>
export type Ingredient = Tables<'recipe_ingredients'>
export type Recipe = Tables<'recipes'> & { recipe_ingredients: Ingredient[] }
export type PlanEntry = Tables<'meal_plan_entries'>
export type Member = { user_id: string; role: string; email: string }

export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type Slot = (typeof SLOTS)[number]

type Result<T> = { data: T | null; error: { message: string } | null }

/** Unwrap a Supabase response, throwing its error so callers can catch one thing. */
async function unwrap<T>(request: PromiseLike<Result<T>>): Promise<T> {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data as T
}

export function listProjects(): Promise<Project[]> {
  return unwrap(supabase.from('projects').select('*').order('created_at'))
}

export function createProject(name: string): Promise<Project> {
  return unwrap(supabase.rpc('create_project', { p_name: name }))
}

export function joinProject(inviteCode: string): Promise<Project> {
  return unwrap(supabase.rpc('join_project', { p_invite_code: inviteCode }))
}

export async function listMembers(projectId: string): Promise<Member[]> {
  const rows = await unwrap(
    supabase
      .from('project_members')
      .select('user_id, role, profiles(email)')
      .eq('project_id', projectId)
      .order('joined_at'),
  )
  return rows.map((row) => ({
    user_id: row.user_id,
    role: row.role,
    email: row.profiles?.email ?? '',
  }))
}

export function listCollections(projectId: string): Promise<Collection[]> {
  return unwrap(
    supabase.from('collections').select('*').eq('project_id', projectId).order('created_at'),
  )
}

export function createCollection(projectId: string, name: string): Promise<Collection> {
  return unwrap(
    supabase.from('collections').insert({ project_id: projectId, name }).select().single(),
  )
}

export async function listRecipes(projectId: string): Promise<Recipe[]> {
  const recipes = await unwrap(
    supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('project_id', projectId)
      .order('title'),
  )
  for (const recipe of recipes) {
    recipe.recipe_ingredients.sort((a, b) => a.position - b.position)
  }
  return recipes
}

export type RecipeDraft = {
  id: string | null
  collectionId: string
  title: string
  servings: number
  instructions: string
  sourceUrl: string
  ingredients: IngredientInput[]
}

export function saveRecipe(projectId: string, draft: RecipeDraft): Promise<string> {
  return unwrap(
    supabase.rpc('save_recipe', {
      // The generated types mark every argument required; null creates a recipe.
      p_recipe_id: draft.id as string,
      p_project_id: projectId,
      p_collection_id: draft.collectionId,
      p_title: draft.title,
      p_servings: draft.servings,
      p_instructions: draft.instructions,
      p_source_type: 'manual',
      p_source_url: draft.sourceUrl,
      p_ingredients: draft.ingredients,
    }),
  )
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await unwrap(supabase.from('recipes').delete().eq('id', recipeId))
}

export function listEntries(
  projectId: string,
  fromDate: string,
  toDate: string,
): Promise<PlanEntry[]> {
  return unwrap(
    supabase
      .from('meal_plan_entries')
      .select('*')
      .eq('project_id', projectId)
      .gte('plan_date', fromDate)
      .lte('plan_date', toDate)
      .order('created_at'),
  )
}

export async function addEntry(entry: {
  projectId: string
  date: string
  slot: Slot
  recipeId: string
  servings: number
}): Promise<void> {
  await unwrap(
    supabase.from('meal_plan_entries').insert({
      project_id: entry.projectId,
      plan_date: entry.date,
      slot: entry.slot,
      recipe_id: entry.recipeId,
      servings: entry.servings,
    }),
  )
}

export async function updateEntryServings(entryId: string, servings: number): Promise<void> {
  await unwrap(supabase.from('meal_plan_entries').update({ servings }).eq('id', entryId))
}

export async function deleteEntry(entryId: string): Promise<void> {
  await unwrap(supabase.from('meal_plan_entries').delete().eq('id', entryId))
}

/** Call onChange whenever another member edits this project's data. */
export function subscribeToProject(projectId: string, onChange: () => void): () => void {
  const filter = `project_id=eq.${projectId}`
  const channel = supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'collections', filter }, onChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'meal_plan_entries', filter },
      onChange,
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
