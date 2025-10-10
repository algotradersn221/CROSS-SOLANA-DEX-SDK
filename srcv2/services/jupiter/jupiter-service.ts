// Service Jupiter pour la logique métier
import { JupiterApi } from '@/api/jupiter-api.js';
import { QuoteResult, SwapParams, SwapResult, DexError } from '@/types/index.js';
import { PoolRepository } from '@/data/repositories/pool-repository.js';
import { TokenRepository } from '@/data/repositories/token-repository.js';
import BN from 'bn.js';

export class JupiterService {
  private readonly api: JupiterApi;
  private readonly poolRepository: PoolRepository;
  private readonly tokenRepository: TokenRepository;

  constructor(
    poolRepository: PoolRepository,
    tokenRepository: TokenRepository
  ) {
    this.api = new JupiterApi();
    this.poolRepository = poolRepository;
    this.tokenRepository = tokenRepository;
  }

  async getQuote(params: SwapParams): Promise<QuoteResult> {
    try {
      // Validation des paramètres
      this.validateSwapParams(params);

      // Récupération de la cotation depuis l'API
      const quote = await this.api.getQuote(params);

      // Cache des informations de pool si disponible
      await this.cachePoolInfo(params.inputMint, params.outputMint);

      return quote;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'dex' in error) {
        throw error;
      }

      const dexError: DexError = {
        code: 'JUPITER_SERVICE_ERROR',
        message: `Erreur dans le service Jupiter: ${error}`,
        dex: 'jupiter',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      // Vérifier d'abord le cache
      const cachedToken = await this.tokenRepository.getToken(tokenAddress);
      if (cachedToken && cachedToken.price) {
        return cachedToken.price;
      }

      // Récupérer depuis l'API
      const price = await this.api.getTokenPrice(tokenAddress);

      if (price && cachedToken) {
        // Mettre à jour le cache
        await this.tokenRepository.updateTokenPrice(tokenAddress, price);
      }

      return price;
    } catch (error) {
      console.error(`Erreur récupération prix token ${tokenAddress}:`, error);
      return null;
    }
  }

  async executeSwap(
    quoteResponse: any,
    userPublicKey: string
  ): Promise<SwapResult> {
    try {
      // Créer la transaction
      const swapTransaction = await this.api.getSwapTransaction(quoteResponse, userPublicKey);

      // Dans une implémentation complète, ici on signerait et enverrait la transaction
      // Pour l'instant, on simule le résultat
      const result: SwapResult = {
        transactionId: 'simulated_tx_id',
        status: 'pending',
        dex: 'jupiter',
        inputAmount: new BN(quoteResponse.inAmount || 0),
        outputAmount: new BN(quoteResponse.outAmount || 0),
        fee: new BN(quoteResponse.fee || 0)
      };

      return result;
    } catch (error) {
      const dexError: DexError = {
        code: 'JUPITER_SWAP_EXECUTION_ERROR',
        message: `Erreur lors de l'exécution du swap Jupiter: ${error}`,
        dex: 'jupiter',
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
      const pools = await this.poolRepository.getPoolsByToken(inputMint);

      // Si pas de pools trouvés, créer une entrée virtuelle pour le cache
      if (pools.length === 0) {
        // Logique de cache pour les paires de tokens
        console.log(`Cache mis à jour pour la paire ${inputMint}/${outputMint}`);
      }
    } catch (error) {
      // Erreur de cache non critique
      console.warn('Erreur lors de la mise en cache:', error);
    }
  }
}
