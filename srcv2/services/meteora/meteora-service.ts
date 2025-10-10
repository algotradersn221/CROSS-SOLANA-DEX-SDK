// Service Meteora pour la logique métier
import { MeteoraApi } from '@/api/meteora-api.js';
import { QuoteResult, SwapParams, SwapResult, DexError, PoolInfo } from '@/types/index.js';
import { PoolRepository } from '@/data/repositories/pool-repository.js';
import { TokenRepository } from '@/data/repositories/token-repository.js';
import BN from 'bn.js';

export class MeteoraService {
  private readonly api: MeteoraApi;
  private readonly poolRepository: PoolRepository;
  private readonly tokenRepository: TokenRepository;

  constructor(
    poolRepository: PoolRepository,
    tokenRepository: TokenRepository
  ) {
    this.api = new MeteoraApi();
    this.poolRepository = poolRepository;
    this.tokenRepository = tokenRepository;
  }

  async getPools(tokenAddress: string, apiKey: string): Promise<PoolInfo[]> {
    try {
      // Validation de l'adresse du token
      if (!this.isValidAddress(tokenAddress)) {
        throw new Error('Adresse de token invalide');
      }

      // Récupération des pools depuis l'API
      const pools = await this.api.getPools(tokenAddress, apiKey);

      // Cache des pools récupérés
      pools.forEach(pool => {
        this.poolRepository.addPool(pool);
      });

      return pools;
    } catch (error) {
      const dexError: DexError = {
        code: 'METEORA_POOLS_SERVICE_ERROR',
        message: `Erreur dans le service Meteora pour récupérer les pools: ${error}`,
        dex: 'meteora',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getQuote(params: SwapParams, poolAddress: string): Promise<QuoteResult> {
    try {
      // Validation des paramètres
      this.validateSwapParams(params);

      // Récupération de la cotation depuis l'API
      const quote = await this.api.getQuote(params, poolAddress);

      return quote;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'dex' in error) {
        throw error;
      }

      const dexError: DexError = {
        code: 'METEORA_SERVICE_ERROR',
        message: `Erreur dans le service Meteora: ${error}`,
        dex: 'meteora',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async executeSwap(
    swapQuote: any,
    poolAddress: string,
    amount: BN
  ): Promise<SwapResult> {
    try {
      // Dans une implémentation complète, ici on exécuterait le swap DLMM
      // Pour l'instant, on simule le résultat
      const result: SwapResult = {
        transactionId: 'simulated_meteora_tx_id',
        status: 'pending',
        dex: 'meteora',
        inputAmount: amount,
        outputAmount: amount.mul(new BN(98)).div(new BN(100)), // Simulation
        fee: amount.mul(new BN(2)).div(new BN(100)) // 2% de frais estimés
      };

      return result;
    } catch (error) {
      const dexError: DexError = {
        code: 'METEORA_SWAP_EXECUTION_ERROR',
        message: `Erreur lors de l'exécution du swap Meteora: ${error}`,
        dex: 'meteora',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getBestPool(tokenAddress: string, minLiquidity: number = 0): Promise<PoolInfo | null> {
    try {
      // Récupérer les pools depuis le cache ou l'API
      let pools = await this.poolRepository.getPoolsByDex('meteora', tokenAddress);

      if (pools.length === 0) {
        // Si pas de pools en cache, essayer de les récupérer
        // Note: nécessiterait une clé API
        console.warn('Aucun pool Meteora trouvé en cache');
        return null;
      }

      // Filtrer par liquidité minimale
      if (minLiquidity > 0) {
        pools = pools.filter(pool =>
          pool.liquidity && pool.liquidity >= minLiquidity
        );
      }

      // Retourner le pool avec la meilleure liquidité
      return pools.reduce((best, current) => {
        if (!best) return current;
        if (!current.liquidity) return best;
        if (!best.liquidity) return current;
        return current.liquidity > best.liquidity ? current : best;
      }, null as PoolInfo | null);
    } catch (error) {
      console.error('Erreur lors de la recherche du meilleur pool Meteora:', error);
      return null;
    }
  }

  async getDLMMQuote(
    poolAddress: string,
    amount: BN,
    side: 'buy' | 'sell',
    slippage: BN
  ): Promise<any> {
    try {
      // Simulation d'une cotation DLMM
      // Dans une implémentation réelle, cela utiliserait le SDK Meteora DLMM
      const direction = side === 'buy' ? false : true;

      return {
        poolAddress,
        amount,
        direction,
        slippage,
        outAmount: amount.mul(new BN(98)).div(new BN(100)),
        simulated: true
      };
    } catch (error) {
      const dexError: DexError = {
        code: 'METEORA_DLMM_QUOTE_ERROR',
        message: `Erreur lors de la récupération de la cotation DLMM: ${error}`,
        dex: 'meteora',
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

  private isValidAddress(address: string): boolean {
    try {
      // Validation basique d'adresse Solana
      return address.length >= 32 && address.length <= 44;
    } catch {
      return false;
    }
  }
}
