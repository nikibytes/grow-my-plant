/**
 * Optional Instagram Graph client. Used later for:
 *  - fetching the media id / permalink for a Reel
 *  - (future) milestone profile-picture generation hints
 *
 * Kept separate and lazy so the app runs fully without an access token.
 * Secrets (INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_APP_SECRET) are NEVER imported
 * into any module that touches the browser bundle.
 */

const GRAPH_BASE = "https://graph.instagram.com";

function getToken(): string {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN is not configured");
  return token;
}

export interface MediaInfo {
  id: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
}

export async function getMedia(mediaId: string): Promise<MediaInfo> {
  const url = `${GRAPH_BASE}/${mediaId}?fields=id,permalink,caption,timestamp&access_token=${encodeURIComponent(
    getToken(),
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Instagram media fetch failed: ${res.status}`);
  }
  return (await res.json()) as MediaInfo;
}
