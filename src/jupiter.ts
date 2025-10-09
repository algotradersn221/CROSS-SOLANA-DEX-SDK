// Import de fetch pour Node.js <18 (sinon fetch est natif)
import fetch from "node-fetch";
import { delay } from "./dextools.js"; // utilitaire delay
import BN from "bn.js";
import { Transaction, PublicKey, VersionedTransaction, Signer, Keypair } from '@solana/web3.js';
import { wallet, connection } from "./config.js";



// Usage

// Interface pour la réponse API Jupiter Quote
interface JupiterQuoteResponse {
    outAmount: string;   // Montant de sortie estimé en plus petite unité (lamports ou token units)
    routePlan: any;      // Plan de swap avec étapes des pools
    [key: string]: any;  // Autres champs possibles
}

// Interface pour le résultat retourné par la fonction de quote
interface ResultatCotation {
    sortieLamports: BN;      // Montant de sortie en BN
    data: JupiterQuoteResponse; // Données brutes retournées par Jupiter
}

/**
 * Récupère une cotation Jupiter pour un swap token -> token
 * @param inputMint Adresse du token d'entrée
 * @param outputMint Adresse du token de sortie
 * @param montant Montant en unité minimale (lamports ou token units)
 * @param slippageBps Slippage en BPS (default 50 = 0.5%)
 * @returns sortieLamports en BN et données brutes, ou null en cas d'erreur
 */
export async function CotationJupiter(
    inputMint: string,
    outputMint: string,
    montant: number | BN,
    slippageBps: number = 50
): Promise<ResultatCotation | null> {
    // Convertir le montant en string si nécessaire
    const amt = montant instanceof BN ? montant.toString() : montant.toString();

    const input = new PublicKey(inputMint);
    const output = new PublicKey(outputMint);

    const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${input}&outputMint=${output}&amount=${amt}&slippageBps=${slippageBps}`;
    //console.log(url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur API Jupiter: ${response.status}`);
        }

        const data = (await response.json()) as JupiterQuoteResponse;

        if (!data.outAmount) {
            //console.warn("Aucun outAmount retourné par Jupiter");
            return null;
        }

        return {
            sortieLamports: new BN(data.outAmount),
            data
        };
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("Erreur obtenirCotationJupiter:", err.message);
        } else {
            console.error("Erreur obtenirCotationJupiter inconnue:", err);
        }
        await delay(1000); // petite pause avant de réessayer
        return null;
    }
}

// URL de récupération des prix Jupiter
const JUPITER_PRICE_URL = "https://lite-api.jup.ag/price/v3?ids=";

/**
 * Récupère le prix USD d'un token via Jupiter
 * @param tokenAddress Adresse du token
 * @returns prix USD ou null si non trouvé
 */
export async function recupererPrixToken(tokenAddress: string): Promise<number | null> {
    try {
        const res = await fetch(`${JUPITER_PRICE_URL}${tokenAddress}`);
        if (!res.ok) {
            console.error(`Erreur HTTP pour ${tokenAddress}: ${res.status}`);
            return null;
        }

        const data = (await res.json()) as Record<string, { usdPrice?: number }>;

        if (data[tokenAddress] && typeof data[tokenAddress].usdPrice === "number") {
            return data[tokenAddress].usdPrice;
        } else {
            //console.warn(`Prix USD non trouvé pour ${tokenAddress}`);
            return null;
        }
    } catch (err) {
        //console.error(`Erreur recupererPrixJupiter pour ${tokenAddress}:`, err);
        return null;
    }
}
//RECUPERER LA BALANCE EN SOL OU SPL DE N IMPORT QUELLE TOKEN D UN WALLET SOLANA 
export interface TokenBalance {
    amount_lamports: number;
    amount_token: number;
}

interface NativeHoldingResponse {
    amount: number;
    uiAmount: number;
}

interface TokenInfo {
    amount: number;
    uiAmount: number;
}

interface TokenHoldingsResponse {
    tokens: Record<string, TokenInfo[]>;
}

export async function getBalance(
    walletAddress: string,
    tokenMint: string
): Promise<TokenBalance> {
    let amount_lamports = 0;
    let amount_token = 0.0;

    try {
        const isSol = tokenMint.toLowerCase().includes("sol");
        const url = isSol
            ? `https://lite-api.jup.ag/ultra/v1/holdings/${walletAddress}/native`
            : `https://lite-api.jup.ag/ultra/v1/holdings/${walletAddress}`;

        const response = await fetch(url);
        const resp = (await response.json()) as NativeHoldingResponse | TokenHoldingsResponse;

        if (resp) {
            if (isSol) {
                const data = resp as NativeHoldingResponse;
                amount_lamports = data.amount;
                amount_token = data.uiAmount;
            } else {
                const data = resp as TokenHoldingsResponse;
                const tokenData = data.tokens[tokenMint]?.[0];
                if (tokenData) {
                    amount_lamports = tokenData.amount;
                    amount_token = tokenData.uiAmount;
                }
            }
        }

        return { amount_lamports, amount_token };

    } catch (err: any) {
        console.error("Erreur GetBalance:", err.message);
        return { amount_lamports, amount_token };
    }
}


//fonction pour executer un swap sur jupiter



export async function executeSwapJupiter(
    quoteResponse: any,
): Promise<any | null> {
    try {
        // On récupère la réponse JSON du POST vers l’API Jupiter
        interface JupiterSwapResponse {
            swapTransaction?: string;
            // si la transaction est dans un sous-objet, tu peux mettre :
            // data?: { swapTransaction?: string; [key: string]: any }
            [key: string]: any;
        }

        const response = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
            }),
        });

        // 👇 cast pour indiquer le type à TypeScript
        const data = (await response.json()) as JupiterSwapResponse;

        // maintenant TypeScript sait que swapTransaction existe éventuellement
        const swapTransaction = data.swapTransaction; // ou data.data?.swapTransaction

        //console.log(swapTransaction);


        if (!data.swapTransaction) {
            console.warn("Aucune transaction de swap reçue depuis Jupiter.");
            return null;
        }

        // Désérialisation
        const swapTransactionBuf = Buffer.from(data.swapTransaction, "base64");
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

        // Signature
        transaction.sign([wallet]);
        // await delay(500);// pause demi seconde pour eviter les erreurs 429
        // Récupération du dernier blockhash
        const latestBlockHash = await connection.getLatestBlockhash();

        // Envoi de la transaction brute
        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2,
        });

        // Confirmation de la transaction
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: txid,
        });

        console.log(`https://solscan.io/tx/${txid}`);

        return transaction;

    } catch (err) {
        console.error("Erreur lors du swap Jupiter :", err);
        return null;
    }
}
