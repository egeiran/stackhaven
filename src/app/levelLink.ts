import { parseLevel, type Level } from '../core';

// A level can travel in a URL (?custom=…), so the editor can open a draft in
// the real game – on a phone too – without adding it to src/levels first.

/** Packs a level into a URL-safe string (base64url of its JSON, UTF-8 safe). */
export function encodeLevel(level: Level): string {
  const bytes = new TextEncoder().encode(JSON.stringify(level));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The reverse of encodeLevel. Throws if the text is not a valid level. */
export function decodeLevel(encoded: string): Level {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return parseLevel(JSON.parse(new TextDecoder().decode(bytes)), 'level link');
}

/** The level list with `custom` in it, replacing a bundled level with the same id. */
export function withCustomLevel(levels: readonly Level[], custom: Level): Level[] {
  return levels.some((level) => level.id === custom.id)
    ? levels.map((level) => (level.id === custom.id ? custom : level))
    : [...levels, custom];
}
