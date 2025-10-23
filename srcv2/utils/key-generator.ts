import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface pour les informations de clé générée
 */
export interface KeyInfo {
  publicKey: string;
  privateKey: string;
  createdAt: string;
  keyType: 'mainnet' | 'devnet' | 'testnet';
  environment: {
    SECRET_KEY: string;
    WALLET_PUBLIC_KEY: string;
    RPC_URL: string;
    SHYFT_RPC: string;
  };
}

/**
 * Utilitaire pour générer des clés Solana avec sauvegarde
 */
export class KeyGenerator {
  /**
   * Génère une nouvelle paire de clés Solana
   */
  static generateKeypair(): KeyInfo {
    const wallet = Keypair.generate();
    const publicKey = wallet.publicKey.toBase58();
    const privateKey = bs58.encode(wallet.secretKey);
    const createdAt = new Date().toISOString();

    return {
      publicKey,
      privateKey,
      createdAt,
      keyType: 'mainnet',
      environment: {
        SECRET_KEY: privateKey,
        WALLET_PUBLIC_KEY: publicKey,
        RPC_URL: 'https://api.mainnet-beta.solana.com',
        SHYFT_RPC: 'https://api.mainnet-beta.solana.com'
      }
    };
  }

  /**
   * Sauvegarde les informations de clé dans un fichier JSON
   */
  static saveKeyToJson(keyInfo: KeyInfo, filename?: string): string {
    const jsonFilename = filename || `keypair-${Date.now()}.json`;
    const jsonPath = path.join(process.cwd(), jsonFilename);

    fs.writeFileSync(jsonPath, JSON.stringify(keyInfo, null, 2));
    return jsonPath;
  }

  /**
   * Sauvegarde les variables d'environnement dans le fichier .env
   */
  static saveToEnvFile(keyInfo: KeyInfo): string {
    const envPath = path.join(process.cwd(), '.env');

    // Variables à ajouter
    const envVariables = [
      '',
      '# Clés Solana générées automatiquement',
      `SECRET_KEY=${keyInfo.environment.SECRET_KEY}`,
      `WALLET_PUBLIC_KEY=${keyInfo.environment.WALLET_PUBLIC_KEY}`,
      `RPC_URL=${keyInfo.environment.RPC_URL}`,
      `SHYFT_RPC=${keyInfo.environment.SHYFT_RPC}`,
      ''
    ];

    // Lire le fichier .env existant ou créer un nouveau
    let existingContent = '';
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, 'utf8');
    }

    // Vérifier si les variables existent déjà
    const hasExistingKeys = existingContent.includes('SECRET_KEY') ||
                          existingContent.includes('WALLET_PUBLIC_KEY');

    if (hasExistingKeys) {
      // Supprimer les anciennes variables
      const lines = existingContent.split('\n');
      const filteredLines = lines.filter(line =>
        !line.startsWith('SECRET_KEY') &&
        !line.startsWith('WALLET_PUBLIC_KEY') &&
        !line.startsWith('RPC_URL') &&
        !line.startsWith('SHYFT_RPC') &&
        !line.includes('# Clés Solana générées automatiquement')
      );
      existingContent = filteredLines.join('\n');
    }

    // Ajouter les nouvelles variables
    const newContent = existingContent + envVariables.join('\n');

    // Écrire dans le fichier .env
    fs.writeFileSync(envPath, newContent);

    return envPath;
  }

  /**
   * Génère une clé et sauvegarde dans JSON et .env
   */
  static generateAndSave(options: {
    saveToJson?: boolean;
    saveToEnv?: boolean;
    jsonFilename?: string;
  } = {}): {
    keyInfo: KeyInfo;
    jsonPath?: string;
    envPath?: string;
  } {
    const keyInfo = this.generateKeypair();
    let jsonPath: string | undefined;
    let envPath: string | undefined;

    if (options.saveToJson !== false) {
      jsonPath = this.saveKeyToJson(keyInfo, options.jsonFilename);
    }

    if (options.saveToEnv !== false) {
      envPath = this.saveToEnvFile(keyInfo);
    }

    return {
      keyInfo,
      jsonPath,
      envPath
    };
  }

  /**
   * Charge une clé depuis un fichier JSON
   */
  static loadFromJson(jsonPath: string): KeyInfo {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Fichier JSON non trouvé: ${jsonPath}`);
    }

    const content = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(content) as KeyInfo;
  }

  /**
   * Valide une clé publique Solana
   */
  static isValidPublicKey(publicKey: string): boolean {
    try {
      // Tentative de décodage de la clé publique
      bs58.decode(publicKey);
      return publicKey.length === 44; // Les clés Solana font toujours 44 caractères en base58
    } catch {
      return false;
    }
  }

  /**
   * Valide une clé privée Solana
   */
  static isValidPrivateKey(privateKey: string): boolean {
    try {
      const secretKey = bs58.decode(privateKey);
      return secretKey.length === 64; // Les clés privées Solana font toujours 64 bytes
    } catch {
      return false;
    }
  }

  /**
   * Restaure une paire de clés à partir d'une clé privée
   */
  static restoreKeypair(privateKey: string): KeyInfo {
    try {
      const secretKey = bs58.decode(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      const publicKey = keypair.publicKey.toBase58();
      const createdAt = new Date().toISOString();

      return {
        publicKey,
        privateKey,
        createdAt,
        keyType: 'mainnet',
        environment: {
          SECRET_KEY: privateKey,
          WALLET_PUBLIC_KEY: publicKey,
          RPC_URL: 'https://api.mainnet-beta.solana.com',
          SHYFT_RPC: 'https://api.mainnet-beta.solana.com'
        }
      };
    } catch (error) {
      throw new Error(`Impossible de restaurer la paire de clés: ${error}`);
    }
  }
}
