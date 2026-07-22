export interface ParsedAddress {
  name: string;
  email: string;
}

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes base64 into a "byte string" (one JS char per byte). Hand-rolled to
 * avoid depending on `atob`/`Buffer`, neither of which is guaranteed to
 * exist in the Hermes runtime without a polyfill.
 */
function decodeBase64(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  let output = '';
  let buffer = 0;
  let bitsCollected = 0;

  for (const char of clean) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      output += String.fromCharCode((buffer >> bitsCollected) & 0xff);
    }
  }
  return output;
}

function decodeMimeWords(input: string): string {
  const encodedWord = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g;
  return input.replace(encodedWord, (_match, charset, encoding, text) => {
    try {
      if (encoding.toLowerCase() === 'b') {
        return decodeByteString(decodeBase64(text), charset);
      }
      // Quoted-printable ("Q") encoded-word: '_' means space, =XX is a hex byte.
      const withSpaces = text.replace(/_/g, ' ');
      const bytes = withSpaces.replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
        String.fromCharCode(parseInt(hex, 16))
      );
      return decodeByteString(bytes, charset);
    } catch {
      return text;
    }
  });
}

function decodeByteString(byteString: string, charset: string): string {
  const normalized = charset.toLowerCase();
  if (normalized === 'utf-8' || normalized === 'utf8') {
    try {
      return decodeUtf8Bytes(byteString);
    } catch {
      return byteString;
    }
  }
  return byteString;
}

/**
 * Decodes a string of raw UTF-8 bytes (one char code per byte, e.g. from a
 * base64 decode) into a proper JS string. Avoids relying on the global
 * TextDecoder, which is not guaranteed to exist in the Hermes runtime.
 */
function decodeUtf8Bytes(byteString: string): string {
  let result = '';
  let i = 0;
  while (i < byteString.length) {
    const byte1 = byteString.charCodeAt(i);
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
      i += 1;
    } else if ((byte1 & 0xe0) === 0xc0 && i + 1 < byteString.length) {
      const byte2 = byteString.charCodeAt(i + 1);
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
      i += 2;
    } else if ((byte1 & 0xf0) === 0xe0 && i + 2 < byteString.length) {
      const byte2 = byteString.charCodeAt(i + 1);
      const byte3 = byteString.charCodeAt(i + 2);
      result += String.fromCharCode(
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
      );
      i += 3;
    } else if ((byte1 & 0xf8) === 0xf0 && i + 3 < byteString.length) {
      const byte2 = byteString.charCodeAt(i + 1);
      const byte3 = byteString.charCodeAt(i + 2);
      const byte4 = byteString.charCodeAt(i + 3);
      const codepoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f);
      result += String.fromCodePoint(codepoint);
      i += 4;
    } else {
      result += String.fromCharCode(byte1);
      i += 1;
    }
  }
  return result;
}

export function unfoldHeaders(raw: string): string {
  return raw.replace(/\r\n[ \t]+/g, ' ');
}

export function parseHeaderBlock(raw: string): Record<string, string> {
  const unfolded = unfoldHeaders(raw);
  const headers: Record<string, string> = {};
  for (const line of unfolded.split('\r\n')) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const name = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    headers[name] = value;
  }
  return headers;
}

export function parseAddressList(raw: string | undefined): ParsedAddress[] {
  if (!raw) return [];
  const decoded = decodeMimeWords(raw);
  const parts = splitAddressList(decoded);

  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const angleMatch = /^(.*)<([^<>]+)>$/.exec(part);
      if (angleMatch) {
        const name = angleMatch[1].trim().replace(/^"|"$/g, '');
        const email = angleMatch[2].trim();
        return { name: name || email, email };
      }
      return { name: part, email: part };
    });
}

function splitAddressList(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let inQuotes = false;

  for (const char of raw) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (!inQuotes && char === '<') depth++;
    if (!inQuotes && char === '>') depth--;

    if (!inQuotes && depth === 0 && char === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

export function decodeSubject(raw: string | undefined): string {
  return raw ? decodeMimeWords(raw) : '';
}
