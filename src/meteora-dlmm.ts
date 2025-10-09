// meteora-dlmm.ts - Version finale nettoyée pour Meteora DLMM
import DLMMLib from '@meteora-ag/dlmm';
const DLMM = DLMMLib.default;

import { Connection, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import BN from 'bn.js';
import { connection, wallet } from "./config.js"; // Assurez-vous que wallet expose Keypair ou signer

// ------------------------------------
// Meteora DLMM Quotation
// ------------------------------------
export async function QuotationDlmm(
    poolAddressStr: string,
    amount: BN,
    side: "buy" | "sell",
    slippage: BN
) {
    try {
        const direction = side.toLowerCase() === "buy" ? false : true;
        const poolAddress = new PublicKey(poolAddressStr);

        const dlmmPool = await DLMM.create(connection, poolAddress, {
            cluster: "mainnet-beta",
        });

        const binArrays = await dlmmPool.getBinArrayForSwap(direction);
        const swapQuote = dlmmPool.swapQuote(
            amount,
            direction,
            slippage,
            binArrays,
            false, // refreshCache
            3      // maxIterations
        );

        return {
            dlmmPool,
            swapQuote,
            sortieLamports: swapQuote.outAmount,
            direction
        };
    } catch (err) {
        console.error("❌ Erreur Quotation DLMM:", err);
        return null;
    }
}

// ------------------------------------
// Swap Execution
// ------------------------------------
export async function executeSwap(
    swapQuote: DLMMLib.SwapQuote,
    dlmmPool: DLMMLib.default,
    direction: boolean
) {
    const [inToken, outToken] = direction
        ? [dlmmPool.tokenY.publicKey, dlmmPool.tokenX.publicKey]
        : [dlmmPool.tokenX.publicKey, dlmmPool.tokenY.publicKey];

    try {
        const swapTx = await dlmmPool.swap({
            inToken,
            binArraysPubkey: swapQuote.binArraysPubkey,
            inAmount: swapQuote.consumedInAmount,
            lbPair: dlmmPool.pubkey,
            user: wallet.publicKey,
            minOutAmount: swapQuote.minOutAmount,
            outToken,
        });

        const swapTxHash = await sendAndConfirmTransaction(connection, swapTx, [wallet]);
        console.log("✅ Swap confirmé, txHash:", swapTxHash);
    } catch (error) {
        console.error("❌ Erreur lors du swap:", JSON.parse(JSON.stringify(error)));
    }
}

// ------------------------------------
// Exemple d'utilisation
// ------------------------------------
async function main() {
    const poolAddress = "HTvjzsfX3yU6BUodCjZ5vZkUrAxMDTrBs3CJaq43ashR";

    const swapQuote = await QuotationDlmm(
        poolAddress,
        new BN(0.01 * 10 ** 9), // 0.01 token en lamports
        "buy",
        new BN(500) // slippage
    );

    if (swapQuote) {
        await executeSwap(
            swapQuote.swapQuote,
            swapQuote.dlmmPool,
            swapQuote.direction
        );
    }
}

main().catch(console.error);
