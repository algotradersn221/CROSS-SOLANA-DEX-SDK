// Couche API pour Jupiter
import fetch from 'node-fetch';
import { QuoteResult, SwapParams, DexError } from '@/types/index.js';
import BN from 'bn.js';

export class JupiterApi {
  private readonly baseUrl = 'https://lite-api.jup.ag';
  private readonly priceUrl = 'https://lite-api.jup.ag/price/v3';

  async getQuote(params: SwapParams): Promise<QuoteResult> {
    const { inputMint, outputMint, amount, slippage } = params;

    const url = `${this.baseUrl}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount.toString()}&slippageBps=${slippage}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erreur API Jupiter: ${response.status}`);
      }

      const data = await response.json() as any;

      if (!data.outAmount) {
        throw new Error('Aucun montant de sortie retourné par Jupiter');
      }

      return {
        outputAmount: new BN(data.outAmount),
        inputAmount: new BN(amount),
        priceImpact: data.priceImpactPct || 0,
        fee: new BN(data.fee || 0),
        dex: 'jupiter',
        raw: data
      };
    } catch (error) {
      const dexError: DexError = {
        code: 'JUPITER_QUOTE_ERROR',
        message: `Erreur lors de la récupération de la cotation Jupiter: ${error}`,
        dex: 'jupiter',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      const response = await fetch(`${this.priceUrl}?ids=${tokenAddress}`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP pour ${tokenAddress}: ${response.status}`);
      }

      const data = await response.json() as Record<string, { usdPrice?: number }>;

      if (data[tokenAddress] && typeof data[tokenAddress].usdPrice === 'number') {
        return data[tokenAddress].usdPrice!;
      }

      return null;
    } catch (error) {
      console.error(`Erreur récupération prix Jupiter pour ${tokenAddress}:`, error);
      return null;
    }
  }

  async getSwapTransaction(quoteResponse: any, userPublicKey: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/swap/v1/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapAndUnwrapSol: true,
        }),
      });

      const data = await response.json() as any;

      if (!data.swapTransaction) {
        throw new Error('Aucune transaction de swap reçue depuis Jupiter');
      }

      return data.swapTransaction;
    } catch (error) {
      const dexError: DexError = {
        code: 'JUPITER_SWAP_ERROR',
        message: `Erreur lors de la création de la transaction Jupiter: ${error}`,
        dex: 'jupiter',
        timestamp: new Date()
      };
      throw dexError;
    }
  }
}
