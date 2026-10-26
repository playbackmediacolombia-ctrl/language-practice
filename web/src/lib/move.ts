import { makeBackup, readBackup } from './backup';

// Moving to the new address (learnguage.net). The browser keeps each address's saved progress
// separately, so the old app (on github.io) hands it over as a "move code": the backup file,
// gzipped and written as text. Copy and paste carries it between the two Home Screen apps,
// which share the clipboard but nothing else. It never goes through a server.

export const NEW_HOME = new URLSearchParams(location.search).get('newhome') ?? 'https://learnguage.net/'; // tests point it at the local server
const PREFIX = 'LG1.';

/** True in the app at the old github.io address (tests pass ?oldaddress to act like it). */
export const onOldAddress = location.hostname.endsWith('.github.io') || /[?&]oldaddress\b/.test(location.search);

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** All progress and settings as one line of text. */
export async function makeMoveCode(): Promise<string> {
  return PREFIX + toBase64Url(await gzip(await makeBackup().text()));
}

/** Reads a pasted move code (extra text around it is fine) and checks it like a backup file. */
export async function readMoveCode(text: string) {
  const match = text.match(/LG1\.([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("That isn't a move code. In the old app, tap Copy my progress, then paste here.");
  let json: string;
  try {
    json = await gunzip(fromBase64Url(match[1]));
  } catch {
    throw new Error('Part of the move code is missing. Copy it again in the old app and paste the whole thing.');
  }
  return readBackup(new File([json], 'move.json', { type: 'application/json' }));
}

/** Is the new address up yet? (GitHub Pages lets any site read version.json.) */
export async function newHomeIsLive(): Promise<boolean> {
  try {
    const r = await fetch(`${NEW_HOME}version.json?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok && typeof (await r.json()).commit === 'string';
  } catch {
    return false;
  }
}
