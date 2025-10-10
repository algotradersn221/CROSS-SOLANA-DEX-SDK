// Couche API pour Raydium
import axios, { AxiosResponse } from 'axios';
import { QuoteResult, SwapParams, DexError } from '@/types/index.js';
import BN from 'bn.js';

export class RaydiumApi {
  private readonly baseUrl = 'https://api-v3.raydium.io';
  private readonly swapUrl = `${this.baseUrl}/compute/swap-base-out`;
  private readonly poolUrl = `${this.baseUrl}/pool/key`;

  async getQuote(params: SwapParams): Promise<QuoteResult> {
    const { inputMint, outputMint, amount, slippage } = params;

    const url = `${this.swapUrl}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount.toString()}&slippageBps=${slippage * 100}&txVersion=LEGACY`;

    try {
      const response = await axios.get(url);
      const swapResponse = response.data;

      if (!swapResponse.success) {
        throw new Error(swapResponse.msg || 'Erreur API Raydium');
      }

      return {
        outputAmount: new BN(swapResponse.data.otherAmountThreshold),
        inputAmount: new BN(amount),
        priceImpact: swapResponse.data.priceImpactPct || 0,
        fee: new BN(swapResponse.data.fee || 0),
        dex: 'raydium',
        raw: swapResponse
      };
    } catch (error) {
      const dexError: DexError = {
        code: 'RAYDIUM_QUOTE_ERROR',
        message: `Erreur lors de la récupération de la cotation Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getPoolKeys(poolIds: string[]): Promise<any[]> {
    try {
      const url = `${this.poolUrl}?ids=${poolIds.join(',')}`;
      const response = await axios.get(url);

      return response.data.data || [];
    } catch (error) {
      const dexError: DexError = {
        code: 'RAYDIUM_POOL_ERROR',
        message: `Erreur lors de la récupération des pools Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }

  async getPoolList(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/pool/list`);
      return response.data.data || [];
    } catch (error) {
      const dexError: DexError = {
        code: 'RAYDIUM_POOL_LIST_ERROR',
        message: `Erreur lors de la récupération de la liste des pools Raydium: ${error}`,
        dex: 'raydium',
        timestamp: new Date()
      };
      throw dexError;
    }
  }
}
