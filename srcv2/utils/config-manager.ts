// Gestionnaire de configuration sécurisé
import { SdkConfig, DexConfig, DexType } from '@/types/index.js';
import { PublicKey } from '@solana/web3.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: SdkConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  initializeConfig(overrides?: Partial<SdkConfig>): SdkConfig {
    // Validation des variables d'environnement requises
    this.validateEnvironmentVariables();

    const defaultConfig: SdkConfig = {
      rpcUrl: process.env.RPC_URL || process.env.SHYFT_RPC || 'https://api.mainnet-beta.solana.com',
      wallet: {
        publicKey: new PublicKey(process.env.WALLET_PUBLIC_KEY || '11111111111111111111111111111111'),
        signTransaction: async (tx: any) => {
          // Implémentation de signature à fournir
          throw new Error('Méthode de signature non implémentée');
        }
      },
      dexes: {
        jupiter: {
          name: 'jupiter',
          apiUrl: 'https://lite-api.jup.ag',
          enabled: true,
          rateLimit: { requests: 100, window: 60000 }
        },
        raydium: {
          name: 'raydium',
          apiUrl: 'https://api-v3.raydium.io',
          enabled: true,
          rateLimit: { requests: 50, window: 60000 }
        },
        pumpswap: {
          name: 'pumpswap',
          apiUrl: 'https://programs.shyft.to',
          enabled: true,
          rateLimit: { requests: 30, window: 60000 }
        },
        meteora: {
          name: 'meteora',
          apiUrl: 'https://programs.shyft.to',
          enabled: true,
          rateLimit: { requests: 30, window: 60000 }
        }
      },
      retry: {
        maxAttempts: 3,
        delay: 1000
      }
    };

    // Fusionner avec les overrides
    this.config = {
      ...defaultConfig,
      ...overrides,
      dexes: {
        ...defaultConfig.dexes,
        ...overrides?.dexes
      }
    };

    return this.config;
  }

  getConfig(): SdkConfig {
    if (!this.config) {
      throw new Error('Configuration non initialisée. Appelez initializeConfig() d\'abord.');
    }
    return this.config;
  }

  updateDexConfig(dex: DexType, config: Partial<DexConfig>): void {
    if (!this.config) {
      throw new Error('Configuration non initialisée');
    }

    this.config.dexes[dex] = {
      ...this.config.dexes[dex],
      ...config
    };
  }

  isDexEnabled(dex: DexType): boolean {
    if (!this.config) {
      throw new Error('Configuration non initialisée');
    }

    return this.config.dexes[dex]?.enabled || false;
  }

  getDexConfig(dex: DexType): DexConfig {
    if (!this.config) {
      throw new Error('Configuration non initialisée');
    }

    return this.config.dexes[dex];
  }

  private validateEnvironmentVariables(): void {
    const requiredVars = ['RPC_URL', 'WALLET_PUBLIC_KEY'];
    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Variables d'environnement manquantes: ${missingVars.join(', ')}\n` +
        'Créez un fichier .env avec ces variables.'
      );
    }
  }

  // Méthodes utilitaires pour la validation
  validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  validateRpcUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http');
    } catch {
      return false;
    }
  }
}
