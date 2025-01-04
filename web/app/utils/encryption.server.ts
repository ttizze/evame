import crypto from 'node:crypto';

const IV_LENGTH = 16;
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  return key;
}

function deriveKey(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(text: string): string {
  const key = deriveKey(getEncryptionKey());
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  // Normalize whitespace while preserving internal spaces
  let encrypted = cipher.update(text.trim().replace(/\s+/g, ' '));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
  const key = deriveKey(getEncryptionKey());
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8').trim().replace(/\s+/g, ' ');
}
