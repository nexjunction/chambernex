import crypto from 'crypto';
import zlib from 'zlib';

// Configuration constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM

// Retrieve a secure 32-byte key from environment variables
// In production, ensure process.env.ENCRYPTION_KEY is securely configured
const getSecretKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || 'default_fallback_32_byte_secure_key_here!!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Compresses and encrypts a file buffer before cloud storage.
 */
export function encryptAndCompressBuffer(inputBuffer: Buffer): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  // 1. Compress the buffer using gzip
  const compressedBuffer = zlib.gzipSync(inputBuffer);

  // 2. Generate initialization vector for AES-GCM
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getSecretKey();

  // 3. Encrypt the compressed payload
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(compressedBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypts and decompresses a file buffer retrieved from cloud storage.
 */
export function decryptAndDecompressBuffer(
  encryptedDataBase64: string,
  ivBase64: string,
  authTagBase64: string
): Buffer {
  const key = getSecretKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encryptedText = Buffer.from(encryptedDataBase64, 'base64');

  // 1. Decrypt the payload
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decryptedCompressed = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  // 2. Decompress the buffer back to original file format
  const originalBuffer = zlib.gunzipSync(decryptedCompressed);

  return originalBuffer;
}