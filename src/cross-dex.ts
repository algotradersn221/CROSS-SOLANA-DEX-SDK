import { CotationRaydium } from './raydium.js';
import { obtenirCotationJupiter } from './jupiter.js';
import BN from 'bn.js';

export async function Quotations(
    dex: string,
    input: string,
    output: string,
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
        const quote = await obtenirCotationJupiter(input, output, amount, slippage);
        if (!quote) return null;

        return {
            sortieLamports: quote.sortieLamports,
            raw: quote.data,
            dex: 'jupiter'
        };
    }

    throw new Error(`DEX non supporté: ${dex}`);
}
