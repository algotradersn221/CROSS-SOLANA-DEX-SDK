// Imports de Solana et SPL Token
import { Transaction, PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios, { AxiosResponse } from 'axios';

// Imports de configuration (wallet et connection) remplacés par placeholders
import { connection, owner } from './config.js';
import { wallet } from './config.js';

// Imports du SDK Raydium v2
import {
    API_URLS,
    ApiSwapV1Out,
    USDCMint,
    PoolKeys,
    getATAAddress,
    swapBaseInAutoAccount,
    ALL_PROGRAM_ID,
    printSimulate,
    addComputeBudget,
    Raydium
} from '@raydium-io/raydium-sdk-v2';

import BN from 'bn.js';

// Interface pour le résultat du swap
interface ResultatSwap {
    swapResponse: ApiSwapV1Out;
    poolKeys: PoolKeys[];
}

// Initialisation du SDK Raydium
/*const raydium = await Raydium.load({
    connection,
    owner: wallet // Wallet propriétaire (anonymisé si publié)
});
*/
/**
 * Récupère la liste des pools Raydium pour un token donné
 * @param token mint du token
 */
/*
export async function recupererPoolsRaydium(token: string) {
    return await raydium.api.getPoolList();
}
*/
/**
 * Récupère une cotation pour un swap sur Raydium
 * @param inputMint Mint du token à envoyer
 * @param outputMint Mint du token à recevoir
 * @param montant Montant en plus petite unité du token (ex: 1 USDC = 1_000_000 si decimals = 6)
 * @param slippage Slippage en pourcentage (ex: 0.5 pour 0.5%)
 * @returns swapResponse, pools concernés et sortieLamports
 */
export const CotationRaydium = async (
    inputMint: string,
    outputMint: string,
    montant: number,
    slippage: number
): Promise<ResultatSwap & { sortieLamports: BN }> => {
    const versionTx: 'LEGACY' | 'VO' = 'LEGACY';

    // 1️⃣ Récupérer le plan de swap via API Raydium
    const { data: swapResponse } = await axios.get<ApiSwapV1Out>(
        `${API_URLS.SWAP_HOST}/compute/swap-base-out?inputMint=${inputMint}&outputMint=${outputMint}&amount=${montant}&slippageBps=${slippage * 100}&txVersion=${versionTx}`
    );

    if (!swapResponse.success) throw new Error(swapResponse.msg);

    // 2️⃣ Récupérer les pools correspondant au plan de swap
    const poolRes = await axios.get<AxiosResponse<PoolKeys[]>>(
        API_URLS.BASE_HOST + API_URLS.POOL_KEY_BY_ID + `?ids=${swapResponse.data.routePlan.map(r => r.poolId).join(',')}`
    );

    // 3️⃣ Retourner swapResponse, pools et montant minimal en lamports
    return {
        swapResponse,
        poolKeys: poolRes.data.data,
        sortieLamports: new BN(swapResponse.data.otherAmountThreshold)
    };
};

/**
 * Effectue le swap sur Raydium
 * @param swapResponse Plan de swap obtenu via l'API
 * @param poolKeys Pools correspondants
 * @param montant Montant à échanger (en plus petite unité)
 */
export const executeSwapRaydium = async (swapResponse: any, poolKeys: any, montant: number) => {
    const inputMint = swapResponse.data.routePlan[0].fromMint;
    const outputMint = swapResponse.data.routePlan[swapResponse.data.routePlan.length - 1].toMint;

    // Récupération des mints et des programmes des tokens
    const tousLesMints = poolKeys.map((r: any) => [r.mintA, r.mintB]).flat();
    const [programMintA, programMintB] = [
        tousLesMints.find((m: any) => m.address === inputMint)!.programId,
        tousLesMints.find((m: any) => m.address === outputMint)!.programId,
    ];

    // Comptes associés ATA pour les tokens
    const compteInput = getATAAddress(owner.publicKey, new PublicKey(inputMint), new PublicKey(programMintA)).publicKey;
    const compteOutput = getATAAddress(owner.publicKey, new PublicKey(outputMint), new PublicKey(programMintB)).publicKey;

    // Génération des instructions de swap
    const instructionsSwap = swapBaseInAutoAccount({
        programId: ALL_PROGRAM_ID.Router,
        wallet: owner.publicKey,
        amount: new BN(montant),
        inputAccount: compteInput,
        outputAccount: compteOutput,
        routeInfo: swapResponse,
        poolKeys,
    });

    // Création de la transaction
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const tx = new Transaction();

    // Ajout des instructions Compute Budget
    const { instructions } = addComputeBudget({ units: 600_000, microLamports: 6_000_000 });
    instructions.forEach(i => tx.add(i));

    tx.add(instructionsSwap);
    tx.feePayer = owner.publicKey;
    tx.recentBlockhash = recentBlockhash;

    // Signature de la transaction
    tx.sign(owner);

    // Simulation de la transaction (affichage)
    printSimulate([tx]);
    return tx;
};
