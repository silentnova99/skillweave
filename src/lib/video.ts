export type VideoKind = "SINGLE" | "ONE_SHOT" | "PLAYLIST";

export interface VideoEmbed {
  provider: "YouTube";
  kind: VideoKind;
  id: string;
  embedUrl: string;
  thumbnailUrl: string | null;
  watchUrl: string;
}

const YT_ID = /^[A-Za-z0-9_-]{6,}$/;

export const VIDEO_KIND_LABEL: Record<VideoKind, string> = {
  SINGLE: "Video",
  ONE_SHOT: "Full course",
  PLAYLIST: "Playlist",
};

interface ParsedYouTube {
  id: string;
  isPlaylist: boolean;
}

function parseYouTube(rawUrl: string): ParsedYouTube | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = segments[0];
    return id ? { id, isPlaylist: false } : null;
  }

  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;

  const list = url.searchParams.get("list");
  const video = url.searchParams.get("v");

  if (segments[0] === "playlist" || (list && !video)) {
    return list ? { id: list, isPlaylist: true } : null;
  }

  if (segments[0] === "embed") {
    const id = segments[1];
    if (!id) return null;
    return list ? { id: list, isPlaylist: true } : { id, isPlaylist: false };
  }

  if (video) return { id: video, isPlaylist: false };
  return null;
}

export function getVideoEmbed(url: string, videoKind?: string | null): VideoEmbed | null {
  const parsed = parseYouTube(url);
  if (!parsed || !YT_ID.test(parsed.id)) return null;

  const kind: VideoKind = parsed.isPlaylist
    ? "PLAYLIST"
    : videoKind === "ONE_SHOT" || videoKind === "PLAYLIST"
      ? videoKind
      : "SINGLE";

  const base = "https://www.youtube-nocookie.com/embed";
  const embedUrl = parsed.isPlaylist
    ? `${base}/videoseries?list=${parsed.id}`
    : `${base}/${parsed.id}`;

  const thumbnailUrl = parsed.isPlaylist
    ? null
    : `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;

  return {
    provider: "YouTube",
    kind,
    id: parsed.id,
    embedUrl,
    thumbnailUrl,
    watchUrl: url,
  };
}
