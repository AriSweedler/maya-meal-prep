/**
 * The first web link in a piece of text, or null. Phones share recipes as
 * "Lentil Tomato Soup Recipe (https://cooking.example.com/recipes/1-soup)",
 * so the link is found inside whatever surrounds it.
 */
export function extractUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>"'()[\]]+/i.exec(text)
  if (!match) return null
  return match[0].replace(/[.,;:!?]+$/, '')
}

/** A kind of link the importer treats specially. Ordinary recipe pages have none. */
export type LinkClass = {
  id: 'nyt-cooking' | 'instagram'
  /** Shown beside the pasted link when it is recognised. */
  label: string
  /** False while the importer cannot read this kind of link yet. */
  supported: boolean
}

const LINK_CLASSES: { match: (url: URL) => boolean; linkClass: LinkClass }[] = [
  {
    match: (url) => url.hostname === 'cooking.nytimes.com',
    linkClass: { id: 'nyt-cooking', label: 'NYT Cooking recipe', supported: true },
  },
  {
    match: (url) =>
      /(^|\.)instagram\.com$/.test(url.hostname) && /^\/(p|reel|reels|tv)\//.test(url.pathname),
    linkClass: { id: 'instagram', label: 'Instagram post', supported: false },
  },
]

/** The special class a link belongs to, or null for an ordinary page or an invalid link. */
export function classifyLink(link: string): LinkClass | null {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return null
  }
  return LINK_CLASSES.find(({ match }) => match(url))?.linkClass ?? null
}
