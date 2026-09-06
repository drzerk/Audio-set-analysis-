import { StreamingPlatform } from '../types';

export interface UrlValidationResult {
  isValid: boolean;
  platform: StreamingPlatform;
  normalizedUrl: string;
  error?: string;
  isShortLink?: boolean;
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
  'mobile'
]);

/**
 * Validates a SoundCloud URL format thoroughly:
 * - Checks domain validity (soundcloud.com, m.soundcloud.com, on.soundcloud.com)
 * - Ensures protocol is present (auto-normalizes missing https://)
 * - Validates track / set path depth (rejects root, system routes, and bare user profiles)
 */
export function validateSoundCloudUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: '',
      error: 'Bitte gib eine SoundCloud-URL ein.'
    };
  }

  let trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: '',
      error: 'Bitte gib eine SoundCloud-URL ein.'
    };
  }

  // Prepend https:// if omitted by user
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: trimmed,
      error: 'Ungültiges URL-Format. Bitte überprüfe die Webadresse.'
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isSoundCloud =
    hostname === 'soundcloud.com' ||
    hostname === 'www.soundcloud.com' ||
    hostname === 'm.soundcloud.com' ||
    hostname === 'on.soundcloud.com';

  if (!isSoundCloud) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: trimmed,
      error: 'Die angegebene URL ist keine gültige SoundCloud-Domain.'
    };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);

  // Mobile short links: on.soundcloud.com/xyz
  if (hostname === 'on.soundcloud.com') {
    if (segments.length === 0) {
      return {
        isValid: false,
        platform: 'soundcloud',
        normalizedUrl: trimmed,
        error: 'Der SoundCloud-Kurzlink enthält keine Track-ID.'
      };
    }
    return {
      isValid: true,
      platform: 'soundcloud',
      normalizedUrl: parsed.toString(),
      isShortLink: true
    };
  }

  if (segments.length === 0) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: trimmed,
      error: 'Bitte gib eine vollständige Track- oder Set-URL ein (z. B. https://soundcloud.com/artist/track-name).'
    };
  }

  const firstSegment = segments[0].toLowerCase();
  if (SOUNDCLOUD_RESERVED_PATHS.has(firstSegment)) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: trimmed,
      error: `"${firstSegment}" ist eine SoundCloud-Systemseite und verweist auf kein analysierbares Audio-Set.`
    };
  }

  if (segments.length < 2) {
    return {
      isValid: false,
      platform: 'soundcloud',
      normalizedUrl: trimmed,
      error: 'Die URL verweist auf ein Künstlerprofil. Bitte verwende den Link zu einem konkreten Track oder Set (z. B. https://soundcloud.com/artist/track-name).'
    };
  }

  return {
    isValid: true,
    platform: 'soundcloud',
    normalizedUrl: parsed.toString()
  };
}

/**
 * General validator supporting SoundCloud, HearThis, Mixcloud, and direct audio files
 */
export function validateStreamingUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: '',
      error: 'Bitte gib eine gültige Streaming-URL ein.'
    };
  }

  let trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: '',
      error: 'Bitte gib eine URL ein.'
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: trimmed,
      error: 'Ungültiges URL-Format. Bitte eine vollständige Webadresse eingeben.'
    };
  }

  const host = parsed.hostname.toLowerCase();

  // SoundCloud
  if (
    host === 'soundcloud.com' ||
    host === 'www.soundcloud.com' ||
    host === 'm.soundcloud.com' ||
    host === 'on.soundcloud.com'
  ) {
    return validateSoundCloudUrl(trimmed);
  }

  // HearThis.at
  if (host === 'hearthis.at' || host === 'www.hearthis.at' || host === 'hearthis.app') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return {
        isValid: false,
        platform: 'hearthis',
        normalizedUrl: trimmed,
        error: 'Bitte gib einen vollständigen HearThis-Tracklink ein (z. B. https://hearthis.at/artist/set-name).'
      };
    }
    return {
      isValid: true,
      platform: 'hearthis',
      normalizedUrl: parsed.toString()
    };
  }

  // Mixcloud
  if (host === 'mixcloud.com' || host === 'www.mixcloud.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return {
        isValid: false,
        platform: 'mixcloud',
        normalizedUrl: trimmed,
        error: 'Bitte gib einen vollständigen Mixcloud-Link ein (z. B. https://www.mixcloud.com/dj/mix-title/).'
      };
    }
    return {
      isValid: true,
      platform: 'mixcloud',
      normalizedUrl: parsed.toString()
    };
  }

  // Direct Audio Stream / MP3 URL
  const pathLower = parsed.pathname.toLowerCase();
  const isDirectAudio = /\.(mp3|wav|flac|aac|ogg|m4a)$/i.test(pathLower) || pathLower.includes('stream') || pathLower.includes('audio');

  if (isDirectAudio) {
    return {
      isValid: true,
      platform: 'direct',
      normalizedUrl: parsed.toString()
    };
  }

  // Generic web stream
  return {
    isValid: true,
    platform: 'direct',
    normalizedUrl: parsed.toString()
  };
}
