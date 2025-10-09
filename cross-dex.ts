import { QuoteRaydium } from './raydium.js';
import { getQuoteJup } from './jup.js';
import BN from 'bn.js';

export async function Quotations(
    dex: string,
    input: string,
    output: string,
    amount: number | BN,
    slippage: number
) {
    if (dex.toLowerCase() === "raydium") {
        const { swapResponse, poolKeys, sortieLamports } = await QuoteRaydium(
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
        const quote = await getQuoteJup(input, output, amount, slippage);
        if (!quote) return null;

        return {
            sortieLamports: quote.sortieLamports,
            raw: quote.data,
            dex: 'jupiter'
        };
    }

    throw new Error(`DEX non supporté: ${dex}`);
}
