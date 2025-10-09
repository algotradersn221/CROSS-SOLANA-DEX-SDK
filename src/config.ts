// config.ts - Configuration sécurisée pour SDK Solana
import { Keypair, Connection } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import BN from 'bn.js';
import bs58 from "bs58"
import { USDCMint } from '@raydium-io/raydium-sdk-v2';// ------------------------------------
// Connexion à Solana
// ------------------------------------
export const connection = new Connection(process.env.SHYFT_RPC || process.env.RPC_URL || "https://api.mainnet-beta.solana.com");

// ------------------------------------
// Wallet (clé secrète retirée pour sécurité)
// ------------------------------------
// Remplacer par Keypair généré localement ou via un fichier sécurisé
//generer un nouveau wallet
//export const wallet = Keypair.generate();
// ou charger le wallet existant a partir de SECRET KEY DANS votre .env
const secretKey = bs58.decode(process.env.SECRET_KEY!);
export const wallet = Keypair.fromSecretKey(secretKey);
export const owner = wallet;

export const ADDRESS_WALLET = wallet.publicKey.toBase58();


// ------------------------------------
// Montants et paramètres
// ------------------------------------
export const AMOUNT_SOL = parseFloat(process.env.AMOUNT_SOL || "0.1"); // Montant en SOL
export const AMOUNT_LAMPORTS = new BN(AMOUNT_SOL * 1e9); // Convertir en lamports
export const min_USD_LIQUIDITY = parseFloat(process.env.MIN_USD_LIQUIDITY || "1000");

// ------------------------------------
// Tokens
// ------------------------------------
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC sur Solana
export const SOL_MINT = NATIVE_MINT.toBase58();
export const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || "5");

// Adresses fictives pour exemple
export const usdc1 = "USDC_FAKE_ADDRESS_1";
export const usdc2 = USDCMint.toBase58();
export const AMOUNT_USDC = new BN((parseFloat(process.env.AMOUNT_USDC || "100") * 1e6).toString()); // 6 décimales
export const SLIPPAGE = Number(process.env.SLIPPAGE || 100);
