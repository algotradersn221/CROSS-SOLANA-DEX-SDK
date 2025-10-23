// Gestionnaire Cross-DEX pour la logique métier principale
import {
  QuoteResult,
  SwapParams,
  SwapResult,
  DexType,
  DexError,
  SdkConfig
} from '@/types/index.js';
import { JupiterService } from '@/services/jupiter/jupiter-service.js';
import { RaydiumService } from '@/services/raydium/raydium-service.js';
import { PumpSwapService } from '@/services/pumpswap/pumpswap-service.js';
import { MeteoraService } from '@/services/meteora/meteora-service.js';
import { PoolRepository } from '@/data/repositories/pool-repository.js';
import { TokenRepository } from '@/data/repositories/token-repository.js';

export class CrossDexManager {
  private readonly jupiterService: JupiterService;
  private readonly raydiumService: RaydiumService;
  private readonly pumpSwapService: PumpSwapService;
  private readonly meteoraService: MeteoraService;
  private readonly poolRepository: PoolRepository;
  private readonly tokenRepository: TokenRepository;
  private readonly config: SdkConfig;

  constructor(config: SdkConfig) {
    this.config = config;

    // Initialisation des repositories
    this.poolRepository = new PoolRepository();
    this.tokenRepository = new TokenRepository();

    // Initialisation des services
    this.jupiterService = new JupiterService(this.poolRepository, this.tokenRepository);
    this.raydiumService = new RaydiumService(this.poolRepository, this.tokenRepository);
    this.pumpSwapService = new PumpSwapService(this.poolRepository, this.tokenRepository);
    this.meteoraService = new MeteoraService(this.poolRepository, this.tokenRepository);
  }

  async getBestQuote(params: SwapParams): Promise<QuoteResult> {
    try {
      const quotes: QuoteResult[] = [];
      const enabledDexes = this.getEnabledDexes();

      // Récupérer les cotations de tous les DEX activés
      for (const dex of enabledDexes) {
        try {
          const quote = await this.getQuoteFromDex(dex, params);
          if (quote) {
            quotes.push(quote);
          }
        } catch (error) {
          console.warn(`Erreur cotation ${dex}:`, error);
          // Continue avec les autres DEX
        }
      }

      if (quotes.length === 0) {
        throw new Error('Aucune cotation disponible');
      }

      // Retourner la meilleure cotation (plus grand montant de sortie)
      return quotes.reduce((best, current) => {
        return current.outputAmount.gt(best.outputAmount) ? current : best;
      });
    } catch (error) {
      const dexError: DexError = {
        code: 'CROSS_DEX_QUOTE_ERROR',
        message: `Erreur lors de la récupération de la meilleure cotation: ${error}`,
        dex: 'jupiter', // DEX par défaut pour l'erreur
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getQuoteFromDex(dex: DexType, params: SwapParams): Promise<QuoteResult | null> {
    try {
      switch (dex) {
        case 'jupiter':
          return await this.jupiterService.getQuote(params);

        case 'raydium':
          return await this.raydiumService.getQuote(params);

        case 'pumpswap':
          // Pour PumpSwap, on a besoin d'un pool spécifique
          const bestPool = await this.pumpSwapService.getBestPool(params.inputMint);
          if (!bestPool) {
            console.warn('Aucun pool PumpSwap trouvé');
            return null;
          }
          return await this.pumpSwapService.getQuote(params, bestPool);

        case 'meteora':
          // Pour Meteora, on a besoin d'une adresse de pool spécifique
          const meteoraPools = await this.poolRepository.getPoolsByDex('meteora', params.inputMint);
          if (meteoraPools.length === 0) {
            console.warn('Aucun pool Meteora trouvé');
            return null;
          }
          const poolAddress = meteoraPools[0].poolAddress;
          return await this.meteoraService.getQuote(params, poolAddress);

        default:
          throw new Error(`DEX non supporté: ${dex}`);
      }
    } catch (error) {
      console.error(`Erreur cotation ${dex}:`, error);
      return null;
    }
  }

  async executeBestSwap(params: SwapParams): Promise<SwapResult> {
    try {
      // Trouver la meilleure cotation
      const bestQuote = await this.getBestQuote(params);

      // Exécuter le swap sur le meilleur DEX
      return await this.executeSwapOnDex(bestQuote.dex, bestQuote.raw, params);
    } catch (error) {
      const dexError: DexError = {
        code: 'CROSS_DEX_SWAP_ERROR',
        message: `Erreur lors de l'exécution du meilleur swap: ${error}`,
        dex: 'jupiter',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async executeSwapOnDex(dex: DexType, swapData: any, params: SwapParams): Promise<SwapResult> {
    try {
      switch (dex) {
        case 'jupiter':
          return await this.jupiterService.executeSwap(
            swapData,
            this.config.wallet.publicKey.toString()
          );

        case 'raydium':
          // Pour Raydium, on a besoin des pool keys
          const poolKeys = await this.raydiumService.getPoolKeys(
            swapData.data?.routePlan?.map((r: any) => r.poolId) || []
          );
          return await this.raydiumService.executeSwap(swapData, poolKeys, params.amount);

        case 'pumpswap':
          const bestPool = await this.pumpSwapService.getBestPool(params.inputMint);
          if (!bestPool) {
            throw new Error('Aucun pool PumpSwap trouvé');
          }
          return await this.pumpSwapService.executeSwap(swapData, bestPool, params.amount);

        case 'meteora':
          const meteoraPools = await this.poolRepository.getPoolsByDex('meteora', params.inputMint);
          if (meteoraPools.length === 0) {
            throw new Error('Aucun pool Meteora trouvé');
          }
          const poolAddress = meteoraPools[0].poolAddress;
          return await this.meteoraService.executeSwap(swapData, poolAddress, params.amount);

        default:
          throw new Error(`DEX non supporté: ${dex}`);
      }
    } catch (error) {
      const dexError: DexError = {
        code: 'DEX_SWAP_EXECUTION_ERROR',
        message: `Erreur lors de l'exécution du swap sur ${dex}: ${error}`,
        dex,
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getAllQuotes(params: SwapParams): Promise<Record<DexType, QuoteResult | null>> {
    const enabledDexes = this.getEnabledDexes();
    const results: Record<DexType, QuoteResult | null> = {} as any;

    for (const dex of enabledDexes) {
      try {
        results[dex] = await this.getQuoteFromDex(dex, params);
      } catch (error) {
        console.warn(`Erreur cotation ${dex}:`, error);
        results[dex] = null;
      }
    }

    return results;
  }

  private getEnabledDexes(): DexType[] {
    return Object.entries(this.config.dexes)
      .filter(([_, config]) => config.enabled)
      .map(([dex, _]) => dex as DexType);
  }

  // Méthodes utilitaires
  getPoolRepository(): PoolRepository {
    return this.poolRepository;
  }

  getTokenRepository(): TokenRepository {
    return this.tokenRepository;
  }

  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    return await this.jupiterService.getTokenPrice(tokenAddress);
  }
}
