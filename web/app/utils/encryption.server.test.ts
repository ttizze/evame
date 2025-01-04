import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from './encryption.server';

describe('Encryption Utils', () => {

  test('should encrypt and decrypt text correctly', () => {
    const originalText = 'Test message';
    
    const encrypted = encrypt(originalText);
    expect(encrypted).toBeDefined();
    expect(encrypted).toContain(':');
    expect(encrypted.split(':').length).toBe(2);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  test('should handle empty string encryption and decryption', () => {
    const emptyText = '';
    
    const encrypted = encrypt(emptyText);
    const decrypted = decrypt(encrypted);
    
    expect(decrypted).toBe(emptyText);
  });

  test('should throw error when ENCRYPTION_KEY is not set', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = undefined;

    expect(() => encrypt('test')).toThrowError('ENCRYPTION_KEY is not set');
    expect(() => decrypt('invalid:data')).toThrowError('ENCRYPTION_KEY is not set');

    process.env.ENCRYPTION_KEY = originalKey;
  });

  test('should generate different ciphertexts for different plaintext', () => {
    const text1 = 'test1';
    const text2 = 'test2';

    const encrypted1 = encrypt(text1);
    const encrypted2 = encrypt(text2);

    expect(encrypted1).not.toBe(encrypted2);
  });

  test('should generate different ciphertexts for same plaintext due to random IV', () => {
    const text = 'test message';

    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);

    expect(encrypted1).not.toBe(encrypted2);
  });

  test('should throw error for invalid encrypted data format', () => {
    expect(() => decrypt('invalid-data')).toThrow();
    expect(() => decrypt('')).toThrow();
  });

  test('should properly handle API key-like strings', () => {
    const apiKey = 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY';
    
    const encrypted = encrypt(apiKey);
    const decrypted = decrypt(encrypted);
    
    expect(decrypted).toBe(apiKey);
    expect(decrypted.length).toBe(apiKey.length);
    expect(decrypted).not.toContain('\n');
    expect(decrypted).not.toContain('\r');
    expect(decrypted).not.toMatch(/\s/);
  });

  test('should handle API keys with potential whitespace issues', () => {
    const apiKeys = [
      ' AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY ',  // spaces at ends
      'AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY\n',  // newline
      '\tAIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY\t',  // tabs
      'AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY\r\n'  // CRLF
    ];

    for (const key of apiKeys) {
      const encrypted = encrypt(key);
      const decrypted = decrypt(encrypted);
      const cleanKey = 'AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY';
      
      expect(decrypted).toBe(cleanKey);
      expect(decrypted.length).toBe(cleanKey.length);
      expect(decrypted).not.toContain('\n');
      expect(decrypted).not.toContain('\r');
      expect(decrypted).not.toContain('\t');
      expect(decrypted.trim()).toBe(decrypted);
    }
  });
});
