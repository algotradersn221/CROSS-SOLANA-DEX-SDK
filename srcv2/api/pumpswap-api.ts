// Couche API pour PumpSwap
import fetch from 'node-fetch';
import { QuoteResult, SwapParams, DexError, PoolInfo } from '@/types/index.js';
import BN from 'bn.js';

export class PumpSwapApi {
  private readonly shyftUrl = 'https://programs.shyft.to/v0/graphql/accounts';

  async getPools(tokenAddress: string, apiKey: string): Promise<PoolInfo[]> {
    const query = `
      query GetPools {
        pump_fun_amm_Pool(
          where: { base_mint: { _eq: ${JSON.stringify(tokenAddress)} } }
        ) {
          pubkey
          base_mint
          quote_mint
          lp_mint
          lp_supply
          pool_base_token_account
          pool_quote_token_account
          creator
          pool_bump
          index
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
            operationName: 'GetPools'
          }),
        }
      );

      const { data, errors } = await response.json() as { data?: any; errors?: any };

      if (errors) {
        throw new Error(`Erreur GraphQL PumpSwap: ${JSON.stringify(errors)}`);
      }

      const pools = data?.pump_fun_amm_Pool ?? [];

      return pools.map((pool: any) => ({
        poolAddress: pool.pubkey,
        baseMint: pool.base_mint,
        quoteMint: pool.quote_mint,
        dexId: 'pumpswap' as const,
        // Autres propriétés optionnelles
        baseReserve: 0,
        quoteReserve: 0,
        liquidity: 0
      }));
    } catch (error) {
      const dexError: DexError = {
        code: 'PUMPSWAP_POOLS_ERROR',
        message: `Erreur lors de la récupération des pools PumpSwap: ${error}`,
        dex: 'pumpswap',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getQuote(params: SwapParams, poolInfo: PoolInfo): Promise<QuoteResult> {
    // Simulation basique pour PumpSwap
    // Dans une implémentation réelle, cela nécessiterait l'état du pool
    try {
      const { amount } = params;

      // Simulation simplifiée - à remplacer par la vraie logique
      const outputAmount = amount.mul(new BN(95)).div(new BN(100)); // 5% de frais estimés

      return {
        outputAmount,
        inputAmount: amount,
        priceImpact: 0.05, // 5% estimé
        fee: amount.mul(new BN(5)).div(new BN(100)),
        dex: 'pumpswap',
        raw: { poolInfo, simulated: true }
      };
    } catch (error) {
      const dexError: DexError = {
        code: 'PUMPSWAP_QUOTE_ERROR',
        message: `Erreur lors de la récupération de la cotation PumpSwap: ${error}`,
        dex: 'pumpswap',
        timestamp: new Date()
      };
      throw dexError;
    }
  }
}
