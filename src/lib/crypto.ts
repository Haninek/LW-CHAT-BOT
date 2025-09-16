import * as forge from 'node-forge';
import { env } from './env';

class CryptoService {
  private key: string;

  constructor() {
    this.key = env.ENCRYPTION_KEY;
    
    if (this.key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
  }

  // Generate a random encryption key (for setup purposes)
  static generateKey(): string {
    return forge.random.getBytesSync(32);
  }

  // Encrypt a JSON object to a string
  encryptJson(obj: Record<string, any>): string {
    try {
      const jsonString = JSON.stringify(obj);
      
      // Generate a random IV
      const iv = forge.random.getBytesSync(16);
      
      // Create cipher
      const cipher = forge.cipher.createCipher('AES-CBC', this.key.slice(0, 32));
      cipher.start({ iv });
      cipher.update(forge.util.createBuffer(jsonString, 'utf8'));
      cipher.finish();
      
      // Combine IV and encrypted data
      const encrypted = iv + cipher.output.getBytes();
      
      // Return base64 encoded result
      return forge.util.encode64(encrypted);
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Decrypt a string back to a JSON object
  decryptJson(encryptedData: string): Record<string, any> {
    try {
      // Decode from base64
      const encrypted = forge.util.decode64(encryptedData);
      
      // Extract IV and encrypted data
      const iv = encrypted.slice(0, 16);
      const ciphertext = encrypted.slice(16);
      
      // Create decipher
      const decipher = forge.cipher.createDecipher('AES-CBC', this.key.slice(0, 32));
      decipher.start({ iv });
      decipher.update(forge.util.createBuffer(ciphertext));
      const success = decipher.finish();
      
      if (!success) {
        throw new Error('Decryption failed - invalid data or key');
      }
      
      const decryptedJson = decipher.output.toString('utf8');
      return JSON.parse(decryptedJson);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Decryption failed')) {
        throw error;
      }
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Mask sensitive values in a config object
  maskConfig(config: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      const keyLower = key.toLowerCase();
      
      // Check if this is a sensitive field
      if (keyLower.includes('secret') || 
          keyLower.includes('key') || 
          keyLower.includes('token') ||
          keyLower.includes('password')) {
        masked[key] = typeof value === 'string' && value.length > 0 ? '********' : value;
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();

// Export class for testing
export { CryptoService };