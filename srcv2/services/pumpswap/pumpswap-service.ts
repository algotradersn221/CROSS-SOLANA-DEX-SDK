// Service PumpSwap pour la logique métier
import { PumpSwapApi } from '@/api/pumpswap-api.js';
import { QuoteResult, SwapParams, SwapResult, DexError, PoolInfo } from '@/types/index.js';
import { PoolRepository } from '@/data/repositories/pool-repository.js';
import { TokenRepository } from '@/data/repositories/token-repository.js';
import BN from 'bn.js';

export class PumpSwapService {
  private readonly api: PumpSwapApi;
  private readonly poolRepository: PoolRepository;
  private readonly tokenRepository: TokenRepository;

  constructor(
    poolRepository: PoolRepository,
    tokenRepository: TokenRepository
  ) {
    this.api = new PumpSwapApi();
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
        code: 'PUMPSWAP_POOLS_SERVICE_ERROR',
        message: `Erreur dans le service PumpSwap pour récupérer les pools: ${error}`,
        dex: 'pumpswap',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getQuote(params: SwapParams, poolInfo: PoolInfo): Promise<QuoteResult> {
    try {
      // Validation des paramètres
      this.validateSwapParams(params);

      // Récupération de la cotation depuis l'API
      const quote = await this.api.getQuote(params, poolInfo);

      return quote;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'dex' in error) {
        throw error;
      }

      const dexError: DexError = {
        code: 'PUMPSWAP_SERVICE_ERROR',
        message: `Erreur dans le service PumpSwap: ${error}`,
        dex: 'pumpswap',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async executeSwap(
    instructions: any,
    poolInfo: PoolInfo,
    amount: BN
  ): Promise<SwapResult> {
    try {
      // Dans une implémentation complète, ici on exécuterait les instructions
      // Pour l'instant, on simule le résultat
      const result: SwapResult = {
        transactionId: 'simulated_pumpswap_tx_id',
        status: 'pending',
        dex: 'pumpswap',
        inputAmount: amount,
        outputAmount: amount.mul(new BN(95)).div(new BN(100)), // Simulation
        fee: amount.mul(new BN(5)).div(new BN(100)) // 5% de frais estimés
      };

      return result;
    } catch (error) {
      const dexError: DexError = {
        code: 'PUMPSWAP_SWAP_EXECUTION_ERROR',
        message: `Erreur lors de l'exécution du swap PumpSwap: ${error}`,
        dex: 'pumpswap',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getBestPool(tokenAddress: string, minLiquidity: number = 0): Promise<PoolInfo | null> {
    try {
      // Récupérer les pools depuis le cache ou l'API
      let pools = await this.poolRepository.getPoolsByDex('pumpswap', tokenAddress);

      if (pools.length === 0) {
        // Si pas de pools en cache, essayer de les récupérer
        // Note: nécessiterait une clé API
        console.warn('Aucun pool PumpSwap trouvé en cache');
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
      console.error('Erreur lors de la recherche du meilleur pool PumpSwap:', error);
      return null;
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
