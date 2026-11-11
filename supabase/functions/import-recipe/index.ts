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

/** Answer with an error, and log it so it shows in the function's logs. */
function fail(status: number, error: string, detail: Record<string, unknown> = {}): Response {
  console.error(JSON.stringify({ event: 'import-recipe failed', status, error, ...detail }))
  return reply(status, { error })
}

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
  if (typeof url !== 'string') return fail(400, 'Send a link to import.')
  const rejection = rejectUrl(url)
  if (rejection) return fail(400, rejection, { url })

  let page: Response
  try {
    page = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'MayaMealPrep/0.1 (recipe importer; +https://meals.sweedler.com)',
        Accept: 'text/html',
      },
    })
  } catch (cause) {
    return fail(502, 'That page could not be reached.', { url, cause: String(cause) })
  }
  if (!page.ok) {
    return fail(502, `That page answered with an error (${page.status}).`, { url })
  }

  const html = (await page.text()).slice(0, MAX_PAGE_BYTES)
  const recipe = recipeFromHtml(html)
  if (!recipe) {
    return fail(422, 'No recipe was found on that page. You can still type it in by hand.', {
      url,
      pageBytes: html.length,
    })
  }
  return reply(200, { recipe: { ...recipe, sourceUrl: page.url || url } })
})
