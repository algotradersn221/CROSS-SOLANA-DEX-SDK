// Types centralisés pour le SDK Cross-DEX
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

// Types de base
export type DexType = 'jupiter' | 'raydium' | 'pumpswap' | 'meteora';

export type SwapSide = 'buy' | 'sell';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

// Interface pour les pools
export interface PoolInfo {
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
  baseReserve?: number;
  quoteReserve?: number;
  liquidity?: number;
  dexId: DexType;
}

// Interface pour les cotations
export interface QuoteResult {
  outputAmount: BN;
  inputAmount: BN;
  priceImpact: number;
  fee: BN;
  dex: DexType;
  raw: any;
}

// Interface pour les swaps
export interface SwapResult {
  transactionId: string;
  status: TransactionStatus;
  dex: DexType;
  inputAmount: BN;
  outputAmount: BN;
  fee: BN;
}

// Interface pour les tokens
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price?: number;
}

// Interface pour les erreurs
export interface DexError {
  code: string;
  message: string;
  dex: DexType;
  timestamp: Date;
}

// Configuration des DEX
export interface DexConfig {
  name: DexType;
  apiUrl: string;
  enabled: boolean;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// Paramètres de swap
export interface SwapParams {
  inputMint: string;
  outputMint: string;
  amount: BN;
  slippage: number;
  dex?: DexType;
}

// Interface pour les clés générées
export interface GeneratedKeypair {
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  keyType?: 'mainnet' | 'devnet' | 'testnet';
}

// Interface pour les informations de clé étendues
export interface KeypairInfo extends GeneratedKeypair {
  warning?: string;
}

// Configuration générale
export interface SdkConfig {
  rpcUrl: string;
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: any) => Promise<any>;
  };
  dexes: Record<DexType, DexConfig>;
  retry: {
    maxAttempts: number;
    delay: number;
  };
}
