// Couche API pour Meteora DLMM
import fetch from 'node-fetch';
import { QuoteResult, SwapParams, DexError, PoolInfo } from '@/types/index.js';
import BN from 'bn.js';

export class MeteoraApi {
  private readonly shyftUrl = 'https://programs.shyft.to/v0/graphql/accounts';

  async getPools(tokenAddress: string, apiKey: string): Promise<PoolInfo[]> {
    const query = `
      query GetLBPairs {
        meteora_dlmm_LbPair(
          where: { _or: [
            { tokenXMint: { _eq: ${JSON.stringify(tokenAddress)} } },
            { tokenYMint: { _eq: ${JSON.stringify(tokenAddress)} } }
          ] }
        ) {
          reserveX
          reserveY
          tokenXMint
          tokenYMint
          baseKey
          pairType
          oracle
          lastUpdatedAt
          _lamports
        }
      }
    `;

    try {
      const response = await fetch(
        `${this.shyftUrl}?api_key=${apiKey}&network=mainnet-beta`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: {},
            operationName: 'GetLBPairs'
          }),
        }
      );

      const { data, errors } = await response.json() as { data?: any; errors?: any };

      if (errors) {
        throw new Error(`Erreur GraphQL Meteora: ${JSON.stringify(errors)}`);
      }

      const pools = data?.meteora_dlmm_LbPair ?? [];

      return pools.map((pool: any) => ({
        poolAddress: pool.baseKey,
        baseMint: pool.tokenXMint === tokenAddress ? pool.tokenXMint : pool.tokenYMint,
        quoteMint: pool.tokenXMint === tokenAddress ? pool.tokenYMint : pool.tokenXMint,
        dexId: 'meteora' as const,
        // Autres propriétés optionnelles
        baseReserve: 0,
        quoteReserve: 0,
        liquidity: 0
      }));
    } catch (error) {
      const dexError: DexError = {
        code: 'METEORA_POOLS_ERROR',
        message: `Erreur lors de la récupération des pools Meteora: ${error}`,
        dex: 'meteora',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getQuote(params: SwapParams, poolAddress: string): Promise<QuoteResult> {
    // Simulation basique pour Meteora DLMM
    // Dans une implémentation réelle, cela nécessiterait le SDK Meteora
    try {
      const { amount } = params;

      // Simulation simplifiée - à remplacer par la vraie logique DLMM
      const outputAmount = amount.mul(new BN(98)).div(new BN(100)); // 2% de frais estimés

      return {
        outputAmount,
        inputAmount: amount,
        priceImpact: 0.02, // 2% estimé
        fee: amount.mul(new BN(2)).div(new BN(100)),
        dex: 'meteora',
        raw: { poolAddress, simulated: true }
      };
    } catch (error) {
      const dexError: DexError = {
        code: 'METEORA_QUOTE_ERROR',
        message: `Erreur lors de la récupération de la cotation Meteora: ${error}`,
        dex: 'meteora',
        timestamp: new Date()
      };
      throw dexError;
    }
  }
}
