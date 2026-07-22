import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

function getDataDir(): string {
  const dir = process.env.INBOXZER0_DATA_DIR || path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getMasterKey(): Buffer {
  const keyPath = path.join(getDataDir(), 'master.key');
  if (fs.existsSync(keyPath)) {
    return Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'hex');
  }
  const key = crypto.randomBytes(KEY_LENGTH);
  fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
  return key;
}

/** Encrypts a plaintext string, returning a self-contained base64 payload (iv + authTag + ciphertext). */
export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(payload: string): string {
  const key = getMasterKey();
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function getStoreFilePath(): string {
  return path.join(getDataDir(), 'app-data.enc');
}
