// Streaming metadata & audio resolver for SoundCloud, HearThis.at, Mixcloud and direct audio links
import { Readable } from 'node:stream';

export type StreamingPlatform = 'hearthis' | 'soundcloud' | 'mixcloud' | 'direct' | 'unknown';

export interface StreamMetadataResult {
  platform: StreamingPlatform;
  title: string;
  artist: string;
  duration: number; // in seconds
  artworkUrl?: string;
  streamUrl?: string;
  permalinkUrl?: string;
  downloadable: boolean;
  requiresProxy: boolean;
  description?: string;
  genre?: string;
  bpm?: number;
  tracklist?: Array<{ title: string; artist?: string; timestamp?: number }>;
  note?: string;
  error?: string;
}

// In-memory cache for SoundCloud client_id
let cachedSoundcloudClientId: string | null = null;
let lastClientScrapeTime = 0;

export async function getSoundcloudClientId(): Promise<string | null> {
  const now = Date.now();
  // Cache for 4 hours
  if (cachedSoundcloudClientId && now - lastClientScrapeTime < 4 * 60 * 60 * 1000) {
    return cachedSoundcloudClientId;
  }

  try {
    const res = await fetch('https://soundcloud.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const html = await res.text();
    const scripts = [...html.matchAll(/<script[^>]+src=\"(https:\/\/a-v2\.sndcdn\.com\/assets\/[^\"]+\.js)\"/g)].map(
      (m) => m[1]
    );

    for (const scriptUrl of scripts) {
      try {
        const jsCode = await fetch(scriptUrl).then((r) => r.text());
        const match = jsCode.match(/client_id[\":=]+([a-zA-Z0-9]{32})/);
        if (match && match[1]) {
          cachedSoundcloudClientId = match[1];
          lastClientScrapeTime = now;
          console.log('[SoundCloud Resolver] Fresh client_id extracted:', cachedSoundcloudClientId);
          return cachedSoundcloudClientId;
        }
      } catch (err) {
        // continue trying next script
      }
    }
  } catch (err) {
    console.error('[SoundCloud Resolver] Error scraping client_id:', err);
  }

  // Known fallback public client_id if scraping fails
  return cachedSoundcloudClientId || 'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo';
}

/**
 * Resolves metadata and stream URL for a given audio link
 */
export async function resolveStreamUrl(rawUrl: string): Promise<StreamMetadataResult> {
  const trimmed = rawUrl.trim();

  // 1. Detect platform
  if (trimmed.includes('hearthis.at') || trimmed.includes('hearthis.app')) {
    return resolveHearthis(trimmed);
  }

  if (trimmed.includes('soundcloud.com') || trimmed.includes('on.soundcloud.com')) {
    return resolveSoundcloud(trimmed);
  }

  if (trimmed.includes('mixcloud.com')) {
    return resolveMixcloud(trimmed);
  }

  // 2. Direct Audio file link check
  return resolveDirectAudio(trimmed);
}

/**
 * HearThis.at Resolver
 */
async function resolveHearthis(url: string): Promise<StreamMetadataResult> {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);

    // Format: /artist/track/
    if (parts.length >= 2) {
      const artist = parts[0];
      const track = parts[1];

      const apiUrl = `https://api-v2.hearthis.at/${encodeURIComponent(artist)}/${encodeURIComponent(track)}/?type=tracks`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TechnoSetAnalyzer/2.0' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && (data.stream_url || data.download_url)) {
          const directStream = data.stream_url || data.download_url;
          return {
            platform: 'hearthis',
            title: data.title || `${artist} - ${track}`,
            artist: data.user?.username || artist,
            duration: parseInt(data.duration, 10) || 0,
            artworkUrl: data.artwork_url_retina || data.artwork_url || data.thumb,
            streamUrl: directStream,
            permalinkUrl: data.permalink_url || url,
            downloadable: true,
            requiresProxy: true,
            genre: data.genre || 'Techno',
            bpm: data.bpm ? parseFloat(data.bpm) : undefined,
            description: data.description || ''
          };
        }
      }
    }

    // Fallback scrape for HearThis embed/page
    const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await pageRes.text();

    const titleMatch = html.match(/<meta property=\"og:title\" content=\"([^\"]+)\"/i);
    const imageMatch = html.match(/<meta property=\"og:image\" content=\"([^\"]+)\"/i);
    const mp3Match = html.match(/https:\/\/[^\"]+\.(?:hearthis\.app|hearthis\.at)[^\"]+listen[^\"]*/i);

    return {
      platform: 'hearthis',
      title: titleMatch ? titleMatch[1] : 'HearThis.at Set',
      artist: parts[0] || 'HearThis Artist',
      duration: 0,
      artworkUrl: imageMatch ? imageMatch[1] : undefined,
      streamUrl: mp3Match ? mp3Match[0] : undefined,
      permalinkUrl: url,
      downloadable: !!mp3Match,
      requiresProxy: true
    };
  } catch (err: any) {
    console.error('Hearthis resolve error:', err);
    return {
      platform: 'hearthis',
      title: 'HearThis.at Set',
      artist: 'Unbekannt',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: `HearThis-Link konnte nicht verarbeitet werden: ${err.message}`
    };
  }
}

/**
 * SoundCloud Resolver
 */
async function resolveSoundcloud(url: string): Promise<StreamMetadataResult> {
  try {
    // Follow potential shortlinks (on.soundcloud.com)
    let targetUrl = url;
    if (url.includes('on.soundcloud.com')) {
      const head = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      targetUrl = head.url;
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = await res.text();
    const hydrationMatch = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);/s);

    if (hydrationMatch) {
      const hydrationData = JSON.parse(hydrationMatch[1]);
      const soundObj = hydrationData.find(
        (item: any) => item.hydratable === 'sound' || item.data?.media
      )?.data;

      if (soundObj) {
        const title = soundObj.title || 'SoundCloud Track';
        const artist = soundObj.user?.username || 'SoundCloud Artist';
        const duration = Math.round((soundObj.duration || 0) / 1000);
        const artworkUrl = soundObj.artwork_url?.replace('-large', '-t500x500') || soundObj.user?.avatar_url;
        const permalinkUrl = soundObj.permalink_url || targetUrl;

        // Find progressive mp3 stream or HLS stream
        const transcodings = soundObj.media?.transcodings || [];
        const progressiveTranscoding = transcodings.find(
          (t: any) => t.format?.protocol === 'progressive' || t.preset?.includes('mp3')
        );

        if (progressiveTranscoding) {
          const clientId = await getSoundcloudClientId();
          if (clientId) {
            const mediaRes = await fetch(`${progressiveTranscoding.url}?client_id=${clientId}`);
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              if (mediaData.url) {
                return {
                  platform: 'soundcloud',
                  title,
                  artist,
                  duration,
                  artworkUrl,
                  streamUrl: mediaData.url,
                  permalinkUrl,
                  downloadable: true,
                  requiresProxy: true,
                  genre: soundObj.genre,
                  description: soundObj.description
                };
              }
            }
          }
        }

        return {
          platform: 'soundcloud',
          title,
          artist,
          duration,
          artworkUrl,
          permalinkUrl,
          downloadable: false,
          requiresProxy: true,
          error: 'SoundCloud Stream ist durch Rechteinhaber oder Format-Beschränkung geschützt.'
        };
      }
    }

    // Fallback: oEmbed
    const oembedRes = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(targetUrl)}`);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      return {
        platform: 'soundcloud',
        title: oembed.title || 'SoundCloud Track',
        artist: oembed.author_name || 'SoundCloud Artist',
        duration: 0,
        artworkUrl: oembed.thumbnail_url,
        permalinkUrl: targetUrl,
        downloadable: false,
        requiresProxy: true,
        note: 'Metadaten geladen. Für Audio-Streams wird ein direkter MP3-Download benötigt.'
      };
    }

    return {
      platform: 'soundcloud',
      title: 'SoundCloud Track',
      artist: 'Unbekannt',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: 'SoundCloud Metadaten konnten nicht abgerufen werden.'
    };
  } catch (err: any) {
    console.error('Soundcloud resolve error:', err);
    return {
      platform: 'soundcloud',
      title: 'SoundCloud Track',
      artist: 'Unbekannt',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: `SoundCloud Fehler: ${err.message}`
    };
  }
}

/**
 * Mixcloud Resolver
 */
async function resolveMixcloud(url: string): Promise<StreamMetadataResult> {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (parts.length >= 2) {
      const user = parts[0];
      const cloudcast = parts[1];

      const apiUrl = `https://api.mixcloud.com/${encodeURIComponent(user)}/${encodeURIComponent(cloudcast)}/`;
      const res = await fetch(apiUrl);

      if (res.ok) {
        const data = await res.json();
        const tracklist = (data.sections || [])
          .filter((s: any) => s.section_type === 'track')
          .map((s: any) => ({
            title: s.track?.name || 'Track',
            artist: s.track?.artist?.name || '',
            timestamp: s.start_time
          }));

        return {
          platform: 'mixcloud',
          title: data.name || `${user} - ${cloudcast}`,
          artist: data.user?.name || data.user?.username || user,
          duration: data.audio_length || 0,
          artworkUrl: data.pictures?.large || data.pictures?.medium,
          permalinkUrl: data.url || url,
          downloadable: false, // Mixcloud encrypts HLS streams with rotating tokens
          requiresProxy: true,
          tracklist,
          description: data.description || '',
          note: 'Mixcloud Metadaten & Tracklist erfolgreich geladen. Hinweis: Mixcloud sperrt freies Audio-Streaming per HLS-Tokens. Du kannst das Set als MP3/WAV bereitstellen oder über HearThis / SoundCloud streamen.'
        };
      }
    }

    return {
      platform: 'mixcloud',
      title: 'Mixcloud Cloudcast',
      artist: 'Unbekannt',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: 'Mixcloud Set konnte nicht gefunden werden.'
    };
  } catch (err: any) {
    console.error('Mixcloud resolve error:', err);
    return {
      platform: 'mixcloud',
      title: 'Mixcloud Cloudcast',
      artist: 'Unbekannt',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: `Mixcloud Fehler: ${err.message}`
    };
  }
}

/**
 * Direct Audio URL Resolver (.mp3, .wav, podcast stream, dropbox etc.)
 */
async function resolveDirectAudio(url: string): Promise<StreamMetadataResult> {
  try {
    // Normalise Dropbox links to direct download
    let directUrl = url;
    if (url.includes('dropbox.com')) {
      directUrl = url.replace('dl=0', 'dl=1');
      if (!directUrl.includes('dl=1')) {
        directUrl += (directUrl.includes('?') ? '&' : '?') + 'dl=1';
      }
    }

    const headRes = await fetch(directUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const contentType = headRes.headers.get('content-type') || '';
    const contentLength = headRes.headers.get('content-length');

    // Extract filename from URL
    const urlObj = new URL(directUrl);
    const pathName = urlObj.pathname;
    const rawFilename = pathName.split('/').pop() || 'Techno Stream';
    const decodedFilename = decodeURIComponent(rawFilename).replace(/\.[^/.]+$/, '').replace(/[_.-]/g, ' ');

    const isAudio =
      contentType.includes('audio') ||
      contentType.includes('octet-stream') ||
      /\.(mp3|wav|flac|aac|ogg|m4a)(\?.*)?$/i.test(directUrl);

    if (!isAudio && headRes.status >= 400) {
      return {
        platform: 'unknown',
        title: decodedFilename,
        artist: 'Unbekannte Quelle',
        duration: 0,
        downloadable: false,
        requiresProxy: false,
        error: 'Die angegebene URL lieferte keinen gültigen Audio-Stream (HTTP ' + headRes.status + ').'
      };
    }

    return {
      platform: 'direct',
      title: decodedFilename,
      artist: urlObj.hostname,
      duration: 0,
      streamUrl: directUrl,
      permalinkUrl: directUrl,
      downloadable: true,
      requiresProxy: true,
      note: contentLength ? `Größe: ${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(1)} MB` : undefined
    };
  } catch (err: any) {
    return {
      platform: 'unknown',
      title: 'Audio Stream',
      artist: 'Web Stream',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: `URL konnte nicht aufgerufen werden: ${err.message}`
    };
  }
}

/**
 * Fetches popular trending live Techno sets from HearThis for 1-click test import
 */
export async function getPopularTechnoSets(): Promise<StreamMetadataResult[]> {
  try {
    const res = await fetch('https://api-v2.hearthis.at/feed/?type=popular&category=techno&count=6', {
      headers: { 'User-Agent': 'TechnoSetAnalyzer/2.0' }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((item: any) => item.stream_url || item.download_url)
      .slice(0, 5)
      .map((item: any) => ({
        platform: 'hearthis' as const,
        title: item.title || 'Techno Set',
        artist: item.user?.username || 'DJ',
        duration: parseInt(item.duration, 10) || 3600,
        artworkUrl: item.artwork_url_retina || item.artwork_url || item.thumb,
        streamUrl: item.stream_url || item.download_url,
        permalinkUrl: item.permalink_url,
        downloadable: true,
        requiresProxy: true,
        genre: item.genre || 'Techno',
        description: item.description || ''
      }));
  } catch (err) {
    console.error('Error fetching popular techno sets:', err);
    return [];
  }
}
