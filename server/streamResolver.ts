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

// Known fallback public client_ids if scraping fails
const KNOWN_SOUNDCLOUD_CLIENT_IDS = [
  'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo',
  'a3e059563d7fd3372b49b37f00a00bcf',
  '2t9loNfhTw4fhqqdgRqHGbcFdSl52do1',
  'iZIs9mchVcX5lhVR1EzGCcyddKLC1EBu',
  'bUdM8n3oYfP5p0kX0Mqv2r1iJ1i3l1d0'
];

export async function getSoundcloudClientId(): Promise<string> {
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
  return cachedSoundcloudClientId || KNOWN_SOUNDCLOUD_CLIENT_IDS[0];
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
 * Uses official API v2 resolve, direct track lookups, and progressive/HLS streaming transcodings.
 */
async function resolveSoundcloud(url: string): Promise<StreamMetadataResult> {
  try {
    // 1. Follow shortlinks and normalize URL
    let targetUrl = url.trim();
    if (targetUrl.includes('on.soundcloud.com') || targetUrl.includes('m.soundcloud.com')) {
      try {
        const head = await fetch(targetUrl, {
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (head.url) {
          targetUrl = head.url;
        }
      } catch (e) {
        console.warn('[SoundCloud Resolver] Error following shortlink:', e);
      }
    }

    // Strip social sharing tracking query params (e.g. ?si=..., utm_...)
    const cleanUrl = targetUrl.split('?')[0];
    const clientId = await getSoundcloudClientId();

    // Helper to fetch from SoundCloud API with fallback client IDs
    const fetchScApi = async (endpoint: string) => {
      const clientIdsToTry = [clientId, ...KNOWN_SOUNDCLOUD_CLIENT_IDS.filter((id) => id !== clientId)];
      for (const id of clientIdsToTry) {
        try {
          const sep = endpoint.includes('?') ? '&' : '?';
          const apiUrl = `${endpoint}${sep}client_id=${id}`;
          const res = await fetch(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          if (res.ok) {
            return { data: await res.json(), usedClientId: id };
          }
        } catch (e) {
          // try next
        }
      }
      return null;
    };

    let scData: any = null;
    let activeClientId = clientId;

    // 2. Primary approach: resolve track/playlist by canonical URL
    const resolveResult = await fetchScApi(
      `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(cleanUrl)}`
    );

    if (resolveResult) {
      scData = resolveResult.data;
      activeClientId = resolveResult.usedClientId;
    }

    // 3. Fallback approach: fetch page HTML to extract track/sound ID if direct URL resolve returned 404
    if (!scData) {
      try {
        const pageRes = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const html = await pageRes.text();

        // Extract ID from mobile app meta tags or sound links
        const idMatch =
          html.match(/soundcloud:\/\/(?:sounds|tracks):([0-9]+)/) ||
          html.match(/<meta property="(?:al:ios:url|al:android:url)" content="soundcloud:\/\/(?:sounds|tracks):([0-9]+)"/i) ||
          html.match(/tracks%2F([0-9]+)/) ||
          html.match(/api-v2\.soundcloud\.com\/tracks\/([0-9]+)/);

        if (idMatch && idMatch[1]) {
          const trackResult = await fetchScApi(`https://api-v2.soundcloud.com/tracks/${idMatch[1]}`);
          if (trackResult) {
            scData = trackResult.data;
            activeClientId = trackResult.usedClientId;
          }
        }
      } catch (pageErr) {
        console.warn('[SoundCloud Resolver] HTML scrape fallback error:', pageErr);
      }
    }

    // If we have track or playlist data
    if (scData) {
      // If it's a playlist or DJ set series, extract primary track or overview
      let trackObj = scData;
      let isPlaylist = false;
      if (scData.kind === 'playlist') {
        isPlaylist = true;
        if (scData.tracks && scData.tracks.length > 0) {
          // If first track has full media info, use it, while preserving playlist title
          trackObj = scData.tracks[0].media ? scData.tracks[0] : scData;
        }
      }

      const title = scData.title || trackObj.title || 'SoundCloud Techno Set';
      const artist =
        scData.user?.username ||
        scData.user?.full_name ||
        trackObj.user?.username ||
        'SoundCloud Artist';
      const duration = Math.round((trackObj.duration || scData.duration || 0) / 1000);
      const artworkUrl =
        scData.artwork_url?.replace('-large', '-t500x500') ||
        trackObj.artwork_url?.replace('-large', '-t500x500') ||
        scData.user?.avatar_url ||
        trackObj.user?.avatar_url;
      const permalinkUrl = scData.permalink_url || trackObj.permalink_url || targetUrl;
      const genre = scData.genre || trackObj.genre || 'Techno';
      const description = scData.description || trackObj.description || '';

      const transcodings: any[] = trackObj.media?.transcodings || [];

      // Priority 1: Progressive MP3 stream (fastest, direct seeking)
      const progressiveTranscoding = transcodings.find(
        (t) =>
          t.format?.protocol === 'progressive' &&
          (t.preset?.includes('mp3') || t.format?.mime_type?.includes('mpeg'))
      ) || transcodings.find((t) => t.format?.protocol === 'progressive');

      if (progressiveTranscoding) {
        const streamResult = await fetchScApi(progressiveTranscoding.url);
        if (streamResult?.data?.url) {
          return {
            platform: 'soundcloud',
            title,
            artist,
            duration,
            artworkUrl,
            streamUrl: streamResult.data.url,
            permalinkUrl,
            downloadable: true,
            requiresProxy: true,
            genre,
            description,
            note: isPlaylist ? 'Playlist/Set erkannt: Stream des ersten Sets geladen.' : undefined
          };
        }
      }

      // Priority 2: HLS Stream (supported via our chunked HLS proxy)
      const hlsTranscoding = transcodings.find(
        (t) =>
          t.format?.protocol === 'hls' &&
          (t.preset?.includes('mp3') || t.format?.mime_type?.includes('mpeg'))
      ) || transcodings.find((t) => t.format?.protocol === 'hls');

      if (hlsTranscoding) {
        const streamResult = await fetchScApi(hlsTranscoding.url);
        if (streamResult?.data?.url) {
          return {
            platform: 'soundcloud',
            title,
            artist,
            duration,
            artworkUrl,
            // Route through our dedicated HLS proxy for continuous streaming
            streamUrl: `/api/stream/proxy-hls?url=${encodeURIComponent(streamResult.data.url)}`,
            permalinkUrl,
            downloadable: true,
            requiresProxy: false, // Already routed through internal proxy
            genre,
            description,
            note: 'HLS Audio-Stream erfolgreich bereitgestellt.'
          };
        }
      }

      // If metadata was found but stream is DRM/Go+ protected
      return {
        platform: 'soundcloud',
        title,
        artist,
        duration,
        artworkUrl,
        permalinkUrl,
        downloadable: false,
        requiresProxy: true,
        genre,
        description,
        note: 'Track-Informationen gefunden, der Stream ist jedoch durch SoundCloud Go+ oder Rechteinhaber beschränkt.',
        error: 'SoundCloud Stream ist durch Rechteinhaber oder Go+ beschränkt. Du kannst das Set stattdessen als lokale MP3 hochladen.'
      };
    }

    // 4. Final Fallback: oEmbed
    const oembedRes = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(targetUrl)}`
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      return {
        platform: 'soundcloud',
        title: oembed.title || 'SoundCloud Set',
        artist: oembed.author_name || 'SoundCloud Artist',
        duration: 0,
        artworkUrl: oembed.thumbnail_url,
        permalinkUrl: targetUrl,
        downloadable: false,
        requiresProxy: true,
        note: 'Metadaten geladen. Audio-Download durch SoundCloud-Verschlüsselung eingeschränkt.'
      };
    }

    return {
      platform: 'soundcloud',
      title: 'SoundCloud Set',
      artist: 'Unbekannt',
      duration: 0,
      downloadable: false,
      requiresProxy: true,
      error: 'SoundCloud-Link konnte nicht aufgelöst werden. Bitte prüfe die URL.'
    };
  } catch (err: any) {
    console.error('Soundcloud resolve error:', err);
    return {
      platform: 'soundcloud',
      title: 'SoundCloud Set',
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
 * Fetches popular trending live Techno sets from SoundCloud and HearThis for 1-click test import
 */
export async function getPopularTechnoSets(): Promise<StreamMetadataResult[]> {
  const popularList: StreamMetadataResult[] = [];

  // 1. Try to fetch high-energy SoundCloud techno set
  try {
    const scResolved = await resolveSoundcloud('https://soundcloud.com/ls41cologne/cabmix-002-i-ls41-i-hard');
    if (scResolved && scResolved.downloadable) {
      popularList.push(scResolved);
    }
  } catch (scErr) {
    console.warn('Could not fetch default SoundCloud set for popular feed:', scErr);
  }

  // 2. Fetch HearThis trending sets
  try {
    const res = await fetch('https://api-v2.hearthis.at/feed/?type=popular&category=techno&count=5', {
      headers: { 'User-Agent': 'TechnoSetAnalyzer/2.0' }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const htSets = data
          .filter((item: any) => item.stream_url || item.download_url)
          .slice(0, 4)
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
        popularList.push(...htSets);
      }
    }
  } catch (err) {
    console.error('Error fetching popular techno sets from HearThis:', err);
  }

  return popularList;
}
