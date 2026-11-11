// POST { url } -> the recipe found on that page, for the app to pre-fill its
// recipe form. Only signed-in users may call it. Nothing is saved here.

import { recipeFromHtml, rejectUrl } from './recipe.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PAGE_BYTES = 3_000_000
const FETCH_TIMEOUT_MS = 15_000

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Whether the request carries a valid session for this project. */
async function isSignedIn(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization')
  const apikey = request.headers.get('apikey')
  if (!authorization || !apikey) return false
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { authorization, apikey },
  })
  return response.ok
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' })
  if (!(await isSignedIn(request))) return reply(401, { error: 'Sign in to import recipes.' })

  const { url } = await request.json().catch(() => ({ url: null }))
  if (typeof url !== 'string') return reply(400, { error: 'Send a link to import.' })
  const rejection = rejectUrl(url)
  if (rejection) return reply(400, { error: rejection })

  let page: Response
  try {
    page = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'MayaMealPrep/0.1 (recipe importer; +https://meals.sweedler.com)',
        Accept: 'text/html',
      },
    })
  } catch {
    return reply(502, { error: 'That page could not be reached.' })
  }
  if (!page.ok) {
    return reply(502, { error: `That page answered with an error (${page.status}).` })
  }

  const html = (await page.text()).slice(0, MAX_PAGE_BYTES)
  const recipe = recipeFromHtml(html)
  if (!recipe) {
    return reply(422, {
      error: 'No recipe was found on that page. You can still type it in by hand.',
    })
  }
  return reply(200, { recipe: { ...recipe, sourceUrl: page.url || url } })
})
