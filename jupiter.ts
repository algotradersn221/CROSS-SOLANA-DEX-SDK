// Import de fetch pour Node.js <18 (sinon fetch est natif)
import fetch from "node-fetch";
import { delay } from "./dextools.js"; // utilitaire delay
import BN from "bn.js";
import { Transaction, PublicKey } from '@solana/web3.js';

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
export async function obtenirCotationJupiter(
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
export async function recupererPrixJupiter(tokenAddress: string): Promise<number | null> {
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
