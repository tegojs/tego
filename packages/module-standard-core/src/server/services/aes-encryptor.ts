import crypto from 'node:crypto';
import path from 'node:path';
import { TOKENS, type Tego } from '@tego/core';

import fs from 'fs-extra';

export class AesEncryptor {
  private key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256 encryption.');
    }
    this.key = key;
  }

  async encrypt(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.key as any, iv as any);
        const encrypted = Buffer.concat([cipher.update(Buffer.from(text, 'utf8') as any), cipher.final()] as any[]);
        resolve(iv.toString('hex') + encrypted.toString('hex'));
      } catch (error) {
        reject(error);
      }
    });
  }

  async decrypt(encryptedText: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const iv = Buffer.from(encryptedText.slice(0, 32), 'hex');
        const encrypted = Buffer.from(encryptedText.slice(32), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.key as any, iv as any);
        const decrypted = Buffer.concat([decipher.update(encrypted as any), decipher.final()] as any);
        resolve(decrypted.toString('utf8'));
      } catch (error) {
        reject(error);
      }
    });
  }

  static async getOrGenerateKey(keyFilePath: string): Promise<Buffer> {
    try {
      const key = await fs.readFile(keyFilePath);
      if (key.length !== 32) {
        throw new Error('Invalid key length in file.');
      }
      return key;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        const key = crypto.randomBytes(32);
        await fs.mkdir(path.dirname(keyFilePath), { recursive: true });
        await fs.writeFile(keyFilePath, key as any);
        return key;
      }
      throw new Error(`Failed to load key: ${error.message}`);
    }
  }

  static async getKeyPath(appName: string) {
    const appKeyPath = path.resolve(process.env.TEGO_RUNTIME_HOME, 'storage', 'apps', appName, 'aes_key.dat');
    if (await fs.pathExists(appKeyPath)) {
      return appKeyPath;
    }
    const envKeyPath = path.resolve(
      process.env.TEGO_RUNTIME_HOME,
      'storage',
      'environment-variables',
      appName,
      'aes_key.dat',
    );
    if (await fs.pathExists(envKeyPath)) {
      return envKeyPath;
    }
    return appKeyPath;
  }

  static async create(appName: string) {
    let key: any = process.env.APP_AES_SECRET_KEY;
    if (!key) {
      const keyPath = await this.getKeyPath(appName);
      key = await AesEncryptor.getOrGenerateKey(keyPath);
    }
    return new AesEncryptor(key);
  }
}

export const registerAesEncryptor = async (tego: Tego) => {
  const encryptor = await AesEncryptor.create(tego.name);
  tego.container.set({ id: TOKENS.AesEncryptor, value: encryptor });
  return encryptor;
};
