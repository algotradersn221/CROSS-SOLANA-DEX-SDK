// Exemple d'utilisation du SDK Cross-DEX v2 avec les imports @/
import 'dotenv/config';
import { SolanaCrossDexSdk, SwapParams, DexType } from './index.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

async function example() {
  try {
    // Initialisation du SDK
    const sdk = new SolanaCrossDexSdk({
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      wallet: {
        publicKey: new PublicKey('11111111111111111111111111111111'),
        signTransaction: async (tx) => {
          // Implémentation de signature
          return tx;
        }
      }
    });

    // Paramètres de swap SOL → USDC
    const params: SwapParams = {
      inputMint: 'So11111111111111111111111111111111111111112', // SOL
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: new BN(1000000000), // 1 SOL en lamports
      slippage: 0.5 // 0.5%
    };

    console.log('🔹 Récupération de la meilleure cotation...');

    // Récupérer la meilleure cotation
    const bestQuote = await sdk.getBestQuote(params);
    console.log('✅ Meilleure cotation:', {
      dex: bestQuote.dex,
      outputAmount: bestQuote.outputAmount.toString(),
      priceImpact: bestQuote.priceImpact,
      fee: bestQuote.fee.toString()
    });

    console.log('\n🔹 Récupération de toutes les cotations...');

    // Récupérer toutes les cotations
    const allQuotes = await sdk.getAllQuotes(params);
    Object.entries(allQuotes).forEach(([dex, quote]) => {
      if (quote) {
        console.log(`${dex}: ${quote.outputAmount.toString()} tokens`);
      } else {
        console.log(`${dex}: Pas de cotation disponible`);
      }
    });

    console.log('\n🔹 Récupération du prix du token...');

    // Récupérer le prix d'un token
    const tokenPrice = await sdk.getTokenPrice(params.inputMint);
    if (tokenPrice) {
      console.log(`Prix SOL: $${tokenPrice}`);
    }

    console.log('\n🔹 Configuration des DEX...');

    // Désactiver un DEX
    sdk.setDexEnabled('raydium', false);
    console.log('Raydium désactivé');

    // Activer tous les DEX
    const dexes: DexType[] = ['jupiter', 'raydium', 'pumpswap', 'meteora'];
    dexes.forEach(dex => sdk.setDexEnabled(dex, true));
    console.log('Tous les DEX activés');

    console.log('\n🔹 Statistiques d\'erreurs...');

    // Récupérer les statistiques d'erreurs
    const errorStats = sdk.getErrorStats();
    console.log('Erreurs par DEX:', errorStats);

    console.log('\n✅ Exemple terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur dans l\'exemple:', error);
  }
}

// Exécuter l'exemple
example().catch(console.error);
