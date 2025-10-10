// Service Raydium pour la logique métier
import { RaydiumApi } from '@/api/raydium-api.js';
import { QuoteResult, SwapParams, SwapResult, DexError } from '@/types/index.js';
import { PoolRepository } from '@/data/repositories/pool-repository.js';
import { TokenRepository } from '@/data/repositories/token-repository.js';
import BN from 'bn.js';

export class RaydiumService {
  private readonly api: RaydiumApi;
  private readonly poolRepository: PoolRepository;
  private readonly tokenRepository: TokenRepository;

  constructor(
    poolRepository: PoolRepository,
    tokenRepository: TokenRepository
  ) {
    this.api = new RaydiumApi();
    this.poolRepository = poolRepository;
    this.tokenRepository = tokenRepository;
  }

  async getQuote(params: SwapParams): Promise<QuoteResult> {
    try {
      // Validation des paramètres
      this.validateSwapParams(params);

      // Récupération de la cotation depuis l'API
      const quote = await this.api.getQuote(params);

      // Cache des informations de pool
      await this.cachePoolInfo(params.inputMint, params.outputMint);

      return quote;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'dex' in error) {
        throw error;
      }

      const dexError: DexError = {
        code: 'RAYDIUM_SERVICE_ERROR',
        message: `Erreur dans le service Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getPoolKeys(poolIds: string[]): Promise<any[]> {
    try {
      return await this.api.getPoolKeys(poolIds);
    } catch (error) {
      const dexError: DexError = {
        code: 'RAYDIUM_POOL_KEYS_ERROR',
        message: `Erreur lors de la récupération des clés de pool Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getAllPools(): Promise<any[]> {
    try {
      return await this.api.getPoolList();
    } catch (error) {
      const dexError: DexError = {
        code: 'RAYDIUM_ALL_POOLS_ERROR',
        message: `Erreur lors de la récupération de tous les pools Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async executeSwap(
    swapResponse: any,
    poolKeys: any[],
    amount: BN
  ): Promise<SwapResult> {
    try {
      // Dans une implémentation complète, ici on créerait et enverrait la transaction
      // Pour l'instant, on simule le résultat
      const result: SwapResult = {
        transactionId: 'simulated_raydium_tx_id',
        status: 'pending',
        dex: 'raydium',
        inputAmount: amount,
        outputAmount: new BN(swapResponse.data?.otherAmountThreshold || 0),
        fee: new BN(swapResponse.data?.fee || 0)
      };

      return result;
    } catch (error) {
      const dexError: DexError = {
        code: 'RAYDIUM_SWAP_EXECUTION_ERROR',
        message: `Erreur lors de l'exécution du swap Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  private validateSwapParams(params: SwapParams): void {
    if (!params.inputMint || !params.outputMint) {
      throw new Error('Les adresses de tokens input et output sont requises');
    }

    if (!params.amount || params.amount.lte(new BN(0))) {
      throw new Error('Le montant doit être positif');
    }

    if (params.slippage < 0 || params.slippage > 100) {
      throw new Error('Le slippage doit être entre 0 et 100');
    }
  }

  private async cachePoolInfo(inputMint: string, outputMint: string): Promise<void> {
    try {
      // Essayer de trouver des pools existants
      const pools = await this.poolRepository.getPoolsByDex('raydium');

      // Filtrer les pools pour cette paire de tokens
      const relevantPools = pools.filter(pool =>
        (pool.baseMint === inputMint && pool.quoteMint === outputMint) ||
        (pool.baseMint === outputMint && pool.quoteMint === inputMint)
      );

      if (relevantPools.length > 0) {
        console.log(`Trouvé ${relevantPools.length} pool(s) Raydium pour la paire ${inputMint}/${outputMint}`);
      }
    } catch (error) {
      // Erreur de cache non critique
      console.warn('Erreur lors de la mise en cache Raydium:', error);
    }
  }
}
