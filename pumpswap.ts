// Importation des librairies Solana
import {
    Connection, PublicKey, TransactionMessage,
    ComputeBudgetProgram,
    Keypair, TransactionInstruction,
} from "@solana/web3.js";
import web3 from "@solana/web3.js"; // Pour VersionedTransaction

// Importation des utilitaires SPL Token
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Importation du SDK PumpSwap
import {
    PumpAmmSdk, OnlinePumpAmmSdk,
    SwapSolanaState
} from "@pump-fun/pump-swap-sdk";

// Importations utilitaires internes
import { delay } from "./dextools.js";
import BN from "bn.js";
// Wallet importé depuis config (sensible, remplacé par placeholder)
import { wallet } from "./config.js";
import { PoolInfos } from "./onchain.js";

// Connexions RPC Solana (Mainnet par défaut)
const url = process.env.SHYFT_RPC || "api.mainnet-solana.com";
const url2 = process.env.RPC_URL || "api.mainnet-solana.com";
const connexion1 = new Connection(url);
const connexion2 = new Connection(url2);

// Initialisation du SDK PumpSwap
const pumpAmmSdk = new PumpAmmSdk();
const onlinePumpAmmSdk = new OnlinePumpAmmSdk(connexion1);

/**
 * Fonction pour calculer le montant de sortie d'un AMM classique
 * @param montantEntrant montant en token entré
 * @param reserveEntrante réserve du token entrant
 * @param reserveSortante réserve du token sortant
 * @param numerateurFee fraction de fee (par défaut 997)
 * @param denominateurFee fraction totale (par défaut 1000)
 * @returns montant de sortie calculé
 */
function calculerMontantSortie(montantEntrant: BN, reserveEntrante: BN, reserveSortante: BN, numerateurFee = 997, denominateurFee = 1000): BN {
    const montantAvecFee = montantEntrant.mul(new BN(numerateurFee));
    const numerateur = montantAvecFee.mul(reserveSortante);
    const denominateur = reserveEntrante.mul(new BN(denominateurFee)).add(montantAvecFee);
    return numerateur.div(denominateur);
}

/**
 * Simule le swap pour obtenir le montant de sortie et le montant minimal
 * @param etatSwap état du swap sur Solana
 * @param montant montant à échanger
 * @param coté "buy" ou "sell"
 * @param slippage tolérance de slippage en %
 */
function simulerSwap(etatSwap: any, montant: BN, coté: "buy" | "sell", slippage: number) {
    const reserveBase = new BN(etatSwap.baseReserve);
    const reserveQuote = new BN(etatSwap.quoteReserve);

    let montantSortie: BN;
    if (coté === "buy") {
        montantSortie = calculerMontantSortie(montant, reserveQuote, reserveBase);
    } else {
        montantSortie = calculerMontantSortie(montant, reserveBase, reserveQuote);
    }

    const montantMin = montantSortie.mul(new BN(100 - slippage * 100)).div(new BN(100));

    return { montantSortie, montantMin };
}

/**
 * Fonction pour générer les instructions d'achat d'un token de base
 * @param etatSwap état du swap Solana
 * @param montant montant à acheter
 * @param slippage tolérance de slippage
 */
async function acheterBaseAvecQuote(etatSwap: SwapSolanaState, montant: BN, slippage: number) {
    const { montantSortie, montantMin } = simulerSwap(etatSwap, montant, "buy", slippage);
    const instructions = await pumpAmmSdk.buyBaseInput(etatSwap, montant, slippage);
    return { montantSortie, montantMin, instructions };
}

/**
 * Convertit une TransactionInstruction en JSON lisible
 * @param instruction instruction Solana
 */
function instructionEnJSON(instruction: TransactionInstruction) {
    return {
        programId: instruction.programId.toBase58(),
        keys: instruction.keys.map(k => ({
            pubkey: k.pubkey.toBase58(),
            isSigner: k.isSigner,
            isWritable: k.isWritable
        })),
        data: instruction.data.toString("hex") // ou "base64" si préféré
    };
}

/**
 * Récupère une cotation pour un pool PumpSwap
 * @param pool informations du pool
 * @param montant montant à échanger
 * @param coté "buy" ou "sell"
 * @param slippage tolérance en %
 */
export async function obtenirCotationPumpSwap(pool: PoolInfos, montant: BN, coté: string, slippage: number) {
    try {
        const adressePool = new PublicKey(pool.pool_address);

        // Récupération de l'état du swap sur Solana
        let etatSolana;
        try {
            etatSolana = await onlinePumpAmmSdk.swapSolanaState(
                adressePool,
                wallet.publicKey,
                new PublicKey(pool.pool_base_token_account),
                new PublicKey(pool.pool_quote_token_account)
            );
        } catch (err) {
            console.log("Impossible de récupérer l'état du swap:", err);
            return null;
        }

        // Simulation de l'achat
        const { montantSortie, instructions } = await acheterBaseAvecQuote(etatSolana, new BN(1_000_000_000), 5);
        console.log("Tu recevras environ", montantSortie.toString(), "tokens de base");

    } catch (err) {
        console.log("Erreur lors de la récupération de la cotation PumpSwap:", err);
    }
}
