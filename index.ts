// index.ts
import { getAllUniqueTokens } from "./dextools.js";
import { pummpswapPools, meteoraPools } from "./onchain.js";
import { QuotationDlmm } from "./meteora-dlmm.js";
import { Quotations } from "./cross-dex.js";
import BN from "bn.js";

async function main() {
    console.log("🔹 Récupération de tous les tokens uniques de Dexscreener...");
    const tokens = await getAllUniqueTokens();
    console.log(`✅ Nombre de tokens récupérés: ${tokens.length}`);

    // Exemple: on prend le premier token pour la démo
    const token = tokens[0];
    console.log(`\n🔹 Token choisi pour l'exemple: ${token}`);

    // 🔹 Récupération des pools PumpSwap
    const pumpPools = await pummpswapPools(token, 1, 5);
    console.log(`✅ ${pumpPools.length} pool(s) PumpSwap trouvé(s) pour ce token`);

    if (pumpPools.length > 0) {
        const pool = pumpPools[0];
        console.log("→ Exemple de pool PumpSwap:", pool.pool_address);

        // 🔹 Exemple de quotation cross-dex Raydium
        const amountLamports = 1_000_000_000; // 1 token (selon decimals)
        const slippage = 50; // 0.5% si ton code le considère en base 10000

        const quoteRaydium = await Quotations(
            "raydium",
            token,
            "So11111111111111111111111111111111111111112", // SOL comme output
            amountLamports,
            slippage
        );

        console.log("\n🔹 Quote Raydium:");
        console.log("Sortie minimale tokens (avec slippage):", quoteRaydium?.sortieLamports.toNumber() / 1e9, "SOL");
        console.log("Données brutes:", quoteRaydium?.raw);
    }

    // 🔹 Exemple de quotation Meteora DLMM
    console.log("\n🔹 Exemple de quotation Meteora DLMM...");
    if (pumpPools.length > 0) {
        const poolAddress = pumpPools[0].pool_address;
        const amount = new BN(1_000_000_000); // 1 token (selon decimals)
        const slippageBN = new BN(50); // 0.5%

        const dlmmQuote = await QuotationDlmm(poolAddress, amount, "buy", slippageBN);
        if (dlmmQuote) {
            console.log("Sortie minimale DLMM:", dlmmQuote.sortieLamports.toString());
            console.log("Données brutes:", dlmmQuote.swapQuote);
        }
    }

    // 🔹 Exemple récupération pools Meteora
    const meteoraPoolsFound = await meteoraPools(token, 1, 5);
    console.log(`\n✅ ${meteoraPoolsFound.length} pool(s) Meteora DLMM trouvé(s) pour ce token`);
    meteoraPoolsFound.forEach((pool, idx) => {
        console.log(`${idx + 1}. Pool address: ${pool.pool_address}, Base: ${pool.base_mint}, Quote: ${pool.quote_mint}`);
    });
}

main().catch(err => {
    console.error("Erreur dans main:", err);
});
