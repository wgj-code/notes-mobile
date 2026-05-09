import { useNotesStore } from '../../stores/notesStore';

/**
 * Custom URL scheme used for internal note links.
 * `[[Note Title]]` is converted to `[Note Title](notelink://Note Title)`
 * before being passed to the markdown renderer.
 */
export const NOTELINK_SCHEME = 'notelink://';

/**
 * Regex that matches `[[Note Title]]` wiki-link syntax.
 * Does not match inside code blocks or inline code (handled by caller if needed).
 */
const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Pre-process markdown content: convert `[[Note Title]]` wiki-link syntax
 * into standard markdown links that react-native-markdown-display can render.
 *
 * Example: `See also [[My Other Note]] for details.`
 *       => `See also [My Other Note](notelink://My Other Note) for details.`
 */
export function processWikiLinks(content: string): string {
  return content.replace(WIKILINK_REGEX, (_match, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return _match;
    return `[${trimmedTitle}](${NOTELINK_SCHEME}${trimmedTitle})`;
  });
}

/**
 * Given a notelink URL, extract the target note title.
 * Returns null if the URL is not a notelink.
 */
export function extractNoteTitleFromLink(url: string): string | null {
  if (!url.startsWith(NOTELINK_SCHEME)) return null;
  return decodeURIComponent(url.slice(NOTELINK_SCHEME.length));
}

/**
 * Find a note by title from the notes store.
 * Returns the note ID if found, null otherwise.
 * Performs case-insensitive matching.
 */
export function findNoteIdByTitle(title: string): string | null {
  const { notes } = useNotesStore.getState();
  const lowerTitle = title.toLowerCase();
  const note = notes.find((n) => n.title.toLowerCase() === lowerTitle);
  return note?.id ?? null;
}

/**
 * Check if a URL is an internal note link.
 */
export function isNoteLink(url: string): boolean {
  return url.startsWith(NOTELINK_SCHEME);
}
