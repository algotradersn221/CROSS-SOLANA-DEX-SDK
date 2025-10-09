import { CotationRaydium, executeSwapRaydium } from './raydium.js';
import { CotationJupiter, executeSwapJupiter } from './jupiter.js';
import { CotationPumpSwap } from './pumpswap.js';
import BN from 'bn.js';
import { PoolInfos } from './onchain.js';
import { QuotationDlmm } from './meteora-dlmm.js';
import { RewardInfo } from '@raydium-io/raydium-sdk-v2';

export async function Quotations(
    dex: string,
    input: string,
    output: string,
    pool: PoolInfos | any,
    side: string,
    amount: number,
    slippage: number
) {
    if (dex.toLowerCase() === "raydium") {
        const { swapResponse, poolKeys, sortieLamports } = await CotationRaydium(
            input,
            output,
            amount,
            slippage
        );
        return {
            sortieLamports: sortieLamports instanceof BN ? sortieLamports : new BN(sortieLamports),
            raw: { swapResponse, poolKeys },
            dex: 'raydium'
        };
    }

    if (dex.toLowerCase() === "jupiter") {
        const quote = await CotationJupiter(input, output, amount, slippage);
        if (!quote) return null;

        return {
            sortieLamports: quote.sortieLamports,
            raw: quote.data,
            dex: 'jupiter'
        };
    }

    if (dex.toLowerCase() === "pumpswap") {
        const quote = await CotationPumpSwap(pool, new BN(amount), side, slippage);
        if (!quote) return null;

        return {
            sortieLamports: quote.montantSortie,
            raw: quote.instructions,
            dex: 'pumpswap'
        };
    }
    if (dex.toLocaleLowerCase() === "meteora") {
        const quote = await QuotationDlmm(pool.pool_address, new BN(amount), "buy", new BN(slippage));
        if (!quote) return null;
        return {
            sortieLamports: quote.sortieLamports,
            raw: quote.swapQuote,
            dex: "meteora-dlmm"
        }
    }



    throw new Error(`DEX non supporté: ${dex}`);
}



export async function ExecuteSwap(
    dex: string,
    swapquote: any,
    poolkey: any,
    amount: number
) {
    if (dex.toLowerCase() === "raydium") {
        const result = await executeSwapRaydium(swapquote, poolkey, amount);
        return {
            tx: result,
            dex: 'raydium'
        };
    }

    if (dex.toLowerCase() === "jupiter") {
        const result = await executeSwapJupiter(swapquote);
        return {
            tx: result,
            dex: 'jupiter'
        };
    }

    if (dex.toLowerCase() === "pumpswap") {

        return {
            dex: 'pumpswap'
        };
    }


    throw new Error(`DEX non supporté: ${dex}`);
}
