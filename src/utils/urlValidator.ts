import { StreamingPlatform } from '../types';

export interface UrlValidationResult {
  isValid: boolean;
  platform: StreamingPlatform;
  normalizedUrl: string;
  error?: string;
  isShortLink?: boolean;
  isArtistProfile?: boolean;
  isPlaylist?: boolean;
  message?: string;
}

const SOUNDCLOUD_RESERVED_PATHS = new Set([
  'discover',
  'stream',
  'upload',
  'you',
  'settings',
  'search',
  'terms-of-use',
  'popular',
  'charts',
  'messages',
  'notifications',
  'imprint',
  'jobs',
  'pro',
  'creators',
  'stations',
  'mobile',
  'pages',
  'legal',
  'signin',
  'signup'
]);

const HEARTHIS_RESERVED_PATHS = new Set([
  'feed',
  'popular',
  'categories',
  'upload',
  'search',
  'login',
  'register',
  'terms',
  'privacy',
  'app',
  'charts',
  'live',
  'groups',
  'labels',
  'artists',
  'genres',
  'contact'
]);

const MIXCLOUD_RESERVED_PATHS = new Set([
  'upload',
  'discover',
  'select',
  'developers',
  'categories',
  'tag',
  'live',
  'search',
  'competitions',
  'premium',
  'login',
  'register',
  'terms',
  'privacy',
  'pro',
  'feed',
  'dashboard'
]);

/**
 * Strips surrounding markdown, quotes, angle brackets, and trailing punctuation
 */
export function sanitizeInputUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let cleaned = rawUrl.trim();

  // Strip markdown link formatting: [label](https://...) -> extract url
  const markdownMatch = cleaned.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
  if (markdownMatch && markdownMatch[1]) {
    cleaned = markdownMatch[1];
  }

  // Strip enclosing quotes, angle brackets or backticks
  cleaned = cleaned.replace(/^[<"'`\s]+|[>"'`\s]+$/g, '');

  // Strip trailing sentence punctuation like trailing dot or comma accidentally pasted
  cleaned = cleaned.replace(/[.,;!?)]+$/, '');

  // Auto-prepend https:// if omitted
  if (cleaned && !/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  return cleaned;
}

/**
 * Validates a SoundCloud URL format thoroughly:
 * - Cleans wrapping quotes/brackets and tracking query parameters
 * - Checks domain validity (soundcloud.com, m.soundcloud.com, on.soundcloud.com, soundcloud.app.goo.gl)
 * - Supports tracks, sets/playlists, mobile short links, and artist profiles (auto-resolving latest set)
 */
export function validateSoundCloudUrl(rawUrl: string): UrlValidationResult {
  const cleaned = sanitizeInputUrl(rawUrl);
  if (!cleaned) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: '',
      error: 'Bitte gib eine SoundCloud-URL ein.'
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: cleaned,
      error: 'Ungültiges URL-Format. Bitte überprüfe die Webadresse.'
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isSoundCloud =
    hostname === 'soundcloud.com' ||
    hostname === 'www.soundcloud.com' ||
    hostname === 'm.soundcloud.com' ||
    hostname === 'on.soundcloud.com' ||
    hostname === 'soundcloud.app.goo.gl';

  if (!isSoundCloud) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: cleaned,
      error: 'Die angegebene URL ist keine gültige SoundCloud-Domain.'
    };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);

  // Mobile short links: on.soundcloud.com/xyz or soundcloud.app.goo.gl/xyz
  if (hostname === 'on.soundcloud.com' || hostname === 'soundcloud.app.goo.gl') {
    if (segments.length === 0) {
      return {
        isValid: false,
        platform: 'soundcloud',
        normalizedUrl: cleaned,
        error: 'Der SoundCloud-Kurzlink enthält keine Track-ID.'
      };
    }
    return {
      isValid: true,
      platform: 'soundcloud',
      normalizedUrl: parsed.toString(),
      isShortLink: true,
      message: 'SoundCloud-Kurzlink verifiziert'
    };
  }

  if (segments.length === 0) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: cleaned,
      error: 'Bitte gib eine vollständige Track- oder Set-URL ein (z. B. https://soundcloud.com/artist/track-name).'
    };
  }

  const firstSegment = segments[0].toLowerCase();
  if (SOUNDCLOUD_RESERVED_PATHS.has(firstSegment)) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: cleaned,
      error: `"${firstSegment}" ist eine SoundCloud-Systemseite und verweist auf kein analysierbares Audio-Set.`
    };
  }

  // Preserve secret token for private SoundCloud share links (?secret_token=... or /s-token in path)
  let cleanUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
  const secretToken = parsed.searchParams.get('secret_token');
  if (secretToken) {
    cleanUrl += `?secret_token=${encodeURIComponent(secretToken)}`;
  }

  // Check for playlist / set URL: /artist/sets/set-title
  if (segments.length >= 3 && segments[1].toLowerCase() === 'sets') {
    return {
      isValid: true,
      platform: 'soundcloud',
      normalizedUrl: cleanUrl,
      isPlaylist: true,
      message: 'SoundCloud Playlist / Set-Reihe erkannt'
    };
  }

  // Artist Profile (e.g. https://soundcloud.com/ls41cologne) or /sets /tracks overview
  if (
    segments.length === 1 ||
    (segments.length === 2 && (segments[1] === 'sets' || segments[1] === 'tracks' || segments[1] === 'popular-tracks'))
  ) {
    return {
      isValid: true,
      platform: 'soundcloud',
      normalizedUrl: cleanUrl,
      isArtistProfile: true,
      message: 'SoundCloud-Künstlerprofil erkannt (neuestes Set wird geladen)'
    };
  }

  return {
    isValid: true,
    platform: 'soundcloud',
    normalizedUrl: cleanUrl,
    message: 'SoundCloud Track / Mix verifiziert'
  };
}

/**
 * Validates a HearThis.at URL format:
 * - Supports tracks: /artist/track-title/
 * - Supports sets: /set/set-name/
 * - Supports artist profiles: /artist-name/ (auto-resolves latest track)
 */
export function validateHearThisUrl(rawUrl: string): UrlValidationResult {
  const cleaned = sanitizeInputUrl(rawUrl);
  if (!cleaned) {
    return {
      isValid: false,
      platform: 'hearthis',
      normalizedUrl: '',
      error: 'Bitte gib eine HearThis-URL ein.'
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      isValid: false,
      platform: 'hearthis',
      normalizedUrl: cleaned,
      error: 'Ungültiges URL-Format. Bitte überprüfe die Webadresse.'
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isHearThis =
    host === 'hearthis.at' ||
    host === 'www.hearthis.at' ||
    host === 'm.hearthis.at' ||
    host === 'hearthis.app' ||
    host === 'www.hearthis.app';

  if (!isHearThis) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: cleaned,
      error: 'Die angegebene URL ist keine gültige HearThis.at-Domain.'
    };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return {
      isValid: false,
      platform: 'hearthis',
      normalizedUrl: cleaned,
      error: 'Bitte gib einen vollständigen HearThis-Tracklink ein (z. B. https://hearthis.at/artist/set-name).'
    };
  }

  const firstSegment = segments[0].toLowerCase();
  if (HEARTHIS_RESERVED_PATHS.has(firstSegment)) {
    return {
      isValid: false,
      platform: 'hearthis',
      normalizedUrl: cleaned,
      error: `"${firstSegment}" ist eine HearThis-Systemseite und verweist auf kein analysierbares Set.`
    };
  }

  const cleanUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;

  // Artist profile link (1 segment)
  if (segments.length === 1) {
    return {
      isValid: true,
      platform: 'hearthis',
      normalizedUrl: cleanUrl,
      isArtistProfile: true,
      message: 'HearThis Künstlerprofil erkannt (neuestes Set wird geladen)'
    };
  }

  // Set collection: /set/set-title
  if (segments[0].toLowerCase() === 'set') {
    return {
      isValid: true,
      platform: 'hearthis',
      normalizedUrl: cleanUrl,
      isPlaylist: true,
      message: 'HearThis Set-Reihe verifiziert'
    };
  }

  return {
    isValid: true,
    platform: 'hearthis',
    normalizedUrl: cleanUrl,
    message: 'HearThis.at Set verifiziert'
  };
}

/**
 * Validates a Mixcloud URL format:
 * - Supports shows: /dj-name/mix-title/
 * - Supports DJ profiles: /dj-name/ (auto-resolves latest show)
 */
export function validateMixcloudUrl(rawUrl: string): UrlValidationResult {
  const cleaned = sanitizeInputUrl(rawUrl);
  if (!cleaned) {
    return {
      isValid: false,
      platform: 'mixcloud',
      normalizedUrl: '',
      error: 'Bitte gib eine Mixcloud-URL ein.'
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      isValid: false,
      platform: 'mixcloud',
      normalizedUrl: cleaned,
      error: 'Ungültiges URL-Format. Bitte überprüfe die Webadresse.'
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isMixcloud =
    host === 'mixcloud.com' ||
    host === 'www.mixcloud.com' ||
    host === 'm.mixcloud.com';

  if (!isMixcloud) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: cleaned,
      error: 'Die angegebene URL ist keine gültige Mixcloud-Domain.'
    };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return {
      isValid: false,
      platform: 'mixcloud',
      normalizedUrl: cleaned,
      error: 'Bitte gib einen vollständigen Mixcloud-Link ein (z. B. https://www.mixcloud.com/dj/mix-title/).'
    };
  }

  const firstSegment = segments[0].toLowerCase();
  if (MIXCLOUD_RESERVED_PATHS.has(firstSegment)) {
    return {
      isValid: false,
      platform: 'mixcloud',
      normalizedUrl: cleaned,
      error: `"${firstSegment}" ist eine Mixcloud-Systemseite und verweist auf kein analysierbares Set.`
    };
  }

  const cleanUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;

  // DJ profile link (1 segment)
  if (segments.length === 1) {
    return {
      isValid: true,
      platform: 'mixcloud',
      normalizedUrl: cleanUrl,
      isArtistProfile: true,
      message: 'Mixcloud DJ-Profil erkannt (neueste Show wird geladen)'
    };
  }

  return {
    isValid: true,
    platform: 'mixcloud',
    normalizedUrl: cleanUrl,
    message: 'Mixcloud Cloudcast/Show verifiziert'
  };
}

/**
 * General validator supporting SoundCloud, HearThis, Mixcloud, and direct audio files
 */
export function validateStreamingUrl(rawUrl: string): UrlValidationResult {
  const cleaned = sanitizeInputUrl(rawUrl);
  if (!cleaned) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: '',
      error: 'Bitte gib eine gültige Streaming-URL ein.'
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: cleaned,
      error: 'Ungültiges URL-Format. Bitte eine vollständige Webadresse eingeben.'
    };
  }

  const host = parsed.hostname.toLowerCase();

  // SoundCloud
  if (
    host === 'soundcloud.com' ||
    host === 'www.soundcloud.com' ||
    host === 'm.soundcloud.com' ||
    host === 'on.soundcloud.com' ||
    host === 'soundcloud.app.goo.gl'
  ) {
    return validateSoundCloudUrl(cleaned);
  }

  // HearThis.at
  if (
    host === 'hearthis.at' ||
    host === 'www.hearthis.at' ||
    host === 'm.hearthis.at' ||
    host === 'hearthis.app' ||
    host === 'www.hearthis.app'
  ) {
    return validateHearThisUrl(cleaned);
  }

  // Mixcloud
  if (host === 'mixcloud.com' || host === 'www.mixcloud.com' || host === 'm.mixcloud.com') {
    return validateMixcloudUrl(cleaned);
  }

  // Dropbox direct link handling
  if (host.includes('dropbox.com')) {
    let directUrl = cleaned.replace('dl=0', 'dl=1');
    if (!directUrl.includes('dl=1')) {
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'dl=1';
    }
    return {
      isValid: true,
      platform: 'direct',
      normalizedUrl: directUrl,
      message: '✓ Dropbox Audio-Link verifiziert (Direktdownload aktiv)'
    };
  }

  // Google Drive share link
  if (host.includes('drive.google.com')) {
    const fileIdMatch = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      return {
        isValid: true,
        platform: 'direct',
        normalizedUrl: directUrl,
        message: '✓ Google Drive Audio-Link erkannt'
      };
    }
  }

  // Direct Audio Stream / MP3 URL
  const pathLower = parsed.pathname.toLowerCase();
  const isDirectAudio =
    /\.(mp3|wav|flac|aac|ogg|m4a|aiff|wma)(\?.*)?$/i.test(cleaned) ||
    pathLower.includes('stream') ||
    pathLower.includes('audio') ||
    pathLower.includes('listen');

  if (isDirectAudio) {
    return {
      isValid: true,
      platform: 'direct',
      normalizedUrl: cleaned,
      message: '✓ Direkter Audio-Stream erkannt'
    };
  }

  // Generic web stream URL
  return {
    isValid: true,
    platform: 'direct',
    normalizedUrl: cleaned,
    message: 'Web-Audio-Stream erkannt'
  };
}
