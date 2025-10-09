// index.ts
import { getAllUniqueTokens, sleep } from "./dextools.js";
import { pummpswapPools, meteoraPools } from "./onchain.js";
import { executeSwap, QuotationDlmm } from "./meteora-dlmm.js";
import { ExecuteSwap, Quotations } from "./cross-dex.js";
import { CotationJupiter, recupererPrixToken, executeSwapJupiter } from "./jupiter.js";
import BN from "bn.js";
import { wallet, usdc2, SOL_MINT } from "./config.js";
import bs58 from 'bs58';

async function main() {
    try {

        console.log("🔹 Récupération de tous les tokens uniques de Dexscreener...");
        const tokens = await getAllUniqueTokens();
        console.log(`✅ Nombre de tokens récupérés: ${tokens.length}`);
        if (!tokens || tokens.length == 0)
            throw ("impossible de recuperer la liste des tokens");
        // Exemple: on prend le premier token pour la démo
        const token = tokens[0];
        if (!token || token.length === 0)
            throw ("impossible de recuperer les tokens ");


        console.log(`\n🔹 Token choisi pour l'exemple: ${token}`);
        // prix du token en dollars
        const price = await recupererPrixToken(token);
        if (price) console.log("prix du token", token, "en usd: ", price);
        /*
            // 🔹 Récupération des pools PumpSwap
            const reserve_quote_minimal = 1000;// ex 1SOL ou 1000 USDT/C
            const nombre_pool_max = 5;//nombre de pools maximum a recuperer
            const pumpPools = await pummpswapPools(usdc2, reserve_quote_minimal, nombre_pool_max);
            if (!pumpPools || pumpPools.length === 0)
                throw ("impossible de recuperer les pools de pumpswap pour le token: ");
    
            console.log(`✅ ${pumpPools.length} pool(s) PumpSwap trouvé(s) pour ce token`);
    
            if (pumpPools.length > 0) {
                const pool = pumpPools[0];
                console.log("→ Exemple de pool PumpSwap:", pool.pool_address);
                // pour pumpswap on a besoin de preciser le pool sur la quelle on veut faire le swap, il y a une methode en engineering reverse qui permet de 
                //demande une quotation sans preciser le pool, on va l implamenter plus tard
                const quotePumpswap = await Quotations("pumpswap", "", "", pool, "buy", 1 * 1e9, 50);
                if (quotePumpswap) {
                    console.log("token minimal recu: ", quotePumpswap.sortieLamports.toNumber() / 1e9);
                }
            } 
            // 🔹 Exemple de quotation cross-dex Raydium
            const amountLamports = 1_000_000_000; // 1 token (selon decimals)
            const slippage = 50; // 0.5% si ton code le considère en base 10000
            
            //methode endpoint sans preciser le pool
            const quoteRaydium = await Quotations(
                "raydium",
                usdc2,
                "So11111111111111111111111111111111111111112", // SOL comme output
                "", //pas necessaire de priciser le pool pour raydium ,entrer juste le token a acheter en deuxieme et celui a vendre en premier 
                "",// pas necessaire de pricser le side pour raydium  
                amountLamports,
                slippage
            );
            if (!quoteRaydium) return null;
            console.log("\n🔹 Quote Raydium:");
            console.log("Sortie minimale tokens (avec slippage):", quoteRaydium?.sortieLamports.toNumber() / 1e9, "SOL");
            console.log("Données brutes:", quoteRaydium?.raw);
            
        
    
    
        // 🔹 Exemple de quotation Meteora DLMM
        console.log("\n🔹 Exemple de quotation Meteora DLMM...");
        if (pumpPools.length > 0) {
            const poolAddress = ""; //addresse du pool que tu peux recuperer a partir des fonctions dans dextools
            const amount = 1_000_000_000; // 1 sol (selon decimals)
            const slippage = (50); // 0.5%
    
            const dlmmQuote = await Quotations("meteora", SOL_MINT, usdc2, poolAddress, "buy", amount, slippage)
            if (dlmmQuote) {
                console.log("Sortie minimale DLMM:", dlmmQuote.sortieLamports.toString());
                console.log("Données brutes:", dlmmQuote.raw);
            }
        }
    
        // 🔹 Exemple récupération pools Meteora
        const meteoraPoolsFound = await meteoraPools(token, 1, 5);
        console.log(`\n✅ ${meteoraPoolsFound.length} pool(s) Meteora DLMM trouvé(s) pour ce token`);
        meteoraPoolsFound.forEach((pool, idx) => {
            console.log(`${idx + 1}. Pool address: ${pool.pool_address}, Base: ${pool.base_mint}, Quote: ${pool.quote_mint}`);
        });
        */
        //exemple d utilisation Jupiter
        // d abords obtenir la cotation pour notre swap
        const amount = new BN(0.01 * 1e9); //1 sol converti en lamports 
        const token_a_achater = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";// inputMint | on peut aussi mettre l addresse de n importe quelle token en base 58
        const token_a_vendre = SOL_MINT;//Solana usdc1 pour usdc ou mettez directement l adresse du toke en base58
        const slippage = 1;// slippage en BPS 50=0.5% le slippage maximal autoriser
        //const getQuoteSwapJup = await CotationJupiter(token_a_vendre, token_a_achater, amount, slippage);
        const getQuoteSwapJup = await Quotations("jupiter", token_a_vendre, token_a_achater, "", "", amount.toNumber(), slippage);
        if (getQuoteSwapJup) {
            //console.log("quotation Jup: ", getQuoteSwapJup.data.routePlan);
            //  on peut verifier la sortie minimal garantie par le swap apres frais et slippage applique pour etre certaines qu on va recevoir un certaine nombre de tokens
            const outputAmount = getQuoteSwapJup.sortieLamports;//retourne une valeur en lamports// pour le convertir en valeur token natif tu le divise par 10 puissance nombre de decimals du token base
            // solana et la plus part de ses tokens ont 9 decimals mais usdc a 6 decimals, les tokens creer sur pumpfun ont aussi par defaut 6 decimal
            const output_reel = outputAmount.toNumber() / 1_000_000;// ou 1e9   //// deviser par 10 puissance 6 puisque le token recu est usdc 
            console.log("buy: 1 sol. garantie de usdc minimal recu si swap reussi: ", output_reel, " usdc");
            //await sleep(1000);// pause 0.5 sec pour eviter les erreurs de rate limite  (429)
            const swap = await ExecuteSwap("jupiter", getQuoteSwapJup.raw, "", amount.toNumber())
            if (swap)
                console.log("transaction effectuer avec success: ", swap);
        }

    }
    catch (err) {
        console.log("erreur: ", err);
    }
}

main().catch(err => {
    console.error("Erreur dans main:", err);
});
