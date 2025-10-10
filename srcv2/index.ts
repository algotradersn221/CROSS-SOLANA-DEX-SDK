// Point d'entrée principal pour le SDK Cross-DEX v2
import { CrossDexManager } from '@/business/cross-dex-manager.js';
import { ConfigManager } from '@/utils/config-manager.js';
import { ErrorHandler } from '@/utils/error-handler.js';
import {
  SdkConfig,
  SwapParams,
  QuoteResult,
  SwapResult,
  DexType,
  DexError
} from '@/types/index.js';

// Export des types principaux
export * from '@/types/index.js';

// Export des services
export { CrossDexManager } from '@/business/cross-dex-manager.js';
export { ConfigManager } from '@/utils/config-manager.js';
export { ErrorHandler } from '@/utils/error-handler.js';

// Export des repositories
export { PoolRepository } from '@/data/repositories/pool-repository.js';
export { TokenRepository } from '@/data/repositories/token-repository.js';

// Export des services DEX
export { JupiterService } from '@/services/jupiter/jupiter-service.js';
export { RaydiumService } from '@/services/raydium/raydium-service.js';
export { PumpSwapService } from '@/services/pumpswap/pumpswap-service.js';
export { MeteoraService } from '@/services/meteora/meteora-service.js';

// Export des APIs
export { JupiterApi } from '@/api/jupiter-api.js';
export { RaydiumApi } from '@/api/raydium-api.js';
export { PumpSwapApi } from '@/api/pumpswap-api.js';
export { MeteoraApi } from '@/api/meteora-api.js';

/**
 * Classe principale du SDK Cross-DEX
 */
export class SolanaCrossDexSdk {
  private manager: CrossDexManager;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;

  constructor(config?: Partial<SdkConfig>) {
    this.configManager = ConfigManager.getInstance();
    this.errorHandler = ErrorHandler.getInstance();

    // Initialiser la configuration
    const sdkConfig = this.configManager.initializeConfig(config);

    // Initialiser le gestionnaire cross-dex
    this.manager = new CrossDexManager(sdkConfig);
  }

  /**
   * Récupère la meilleure cotation pour un swap
   */
  async getBestQuote(params: SwapParams): Promise<QuoteResult> {
    try {
      return await this.manager.getBestQuote(params);
    } catch (error) {
      throw this.errorHandler.handleError(error, 'jupiter', 'getBestQuote');
    }
  }

  /**
   * Récupère les cotations de tous les DEX
   */
  async getAllQuotes(params: SwapParams): Promise<Record<DexType, QuoteResult | null>> {
    try {
      return await this.manager.getAllQuotes(params);
    } catch (error) {
      throw this.errorHandler.handleError(error, 'jupiter', 'getAllQuotes');
    }
  }

  /**
   * Récupère une cotation d'un DEX spécifique
   */
  async getQuoteFromDex(dex: DexType, params: SwapParams): Promise<QuoteResult | null> {
    try {
      return await this.manager.getQuoteFromDex(dex, params);
    } catch (error) {
      throw this.errorHandler.handleError(error, dex, 'getQuoteFromDex');
    }
  }

  /**
   * Exécute le meilleur swap disponible
   */
  async executeBestSwap(params: SwapParams): Promise<SwapResult> {
    try {
      return await this.manager.executeBestSwap(params);
    } catch (error) {
      throw this.errorHandler.handleError(error, 'jupiter', 'executeBestSwap');
    }
  }

  /**
   * Exécute un swap sur un DEX spécifique
   */
  async executeSwapOnDex(dex: DexType, swapData: any, params: SwapParams): Promise<SwapResult> {
    try {
      return await this.manager.executeSwapOnDex(dex, swapData, params);
    } catch (error) {
      throw this.errorHandler.handleError(error, dex, 'executeSwapOnDex');
    }
  }

  /**
   * Récupère le prix d'un token
   */
  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      return await this.manager.getTokenPrice(tokenAddress);
    } catch (error) {
      throw this.errorHandler.handleError(error, 'jupiter', 'getTokenPrice');
    }
  }

  /**
   * Récupère les pools d'un DEX spécifique
   */
  async getPools(dex: DexType, tokenAddress?: string): Promise<any[]> {
    try {
      const poolRepo = this.manager.getPoolRepository();
      return await poolRepo.getPoolsByDex(dex, tokenAddress);
    } catch (error) {
      throw this.errorHandler.handleError(error, dex, 'getPools');
    }
  }

  /**
   * Met à jour la configuration d'un DEX
   */
  updateDexConfig(dex: DexType, config: any): void {
    this.configManager.updateDexConfig(dex, config);
  }

  /**
   * Active ou désactive un DEX
   */
  setDexEnabled(dex: DexType, enabled: boolean): void {
    this.configManager.updateDexConfig(dex, { enabled });
  }

  /**
   * Récupère les statistiques d'erreurs
   */
  getErrorStats(): Record<DexType, number> {
    return this.errorHandler.getErrorStats();
  }

  /**
   * Récupère le log d'erreurs
   */
  getErrorLog(): DexError[] {
    return this.errorHandler.getErrorLog();
  }

  /**
   * Efface le log d'erreurs
   */
  clearErrorLog(): void {
    this.errorHandler.clearErrorLog();
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): SdkConfig {
    return this.configManager.getConfig();
  }
}

// Export par défaut
export default SolanaCrossDexSdk;
