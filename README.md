# Solana Cross-Dex Swap SDK

Salut ! Je m'appelle **Aliou Ba**, je suis **Data Analyst de formation**, un peu **geek fou** et passionné par les **Nouvelles Technologies de l'Information et de la Communication (NTIC)**.  
Ce projet est mon laboratoire pour explorer le trading décentralisé sur **Solana** et le développement de SDK cross-dex.  
Il est en construction et sera continuellement enrichi avec de nouvelles fonctionnalités pour le **swap cross-dex**, l’arbitrage et l’analyse de pools.

---

## Fonctionnalités actuelles

- Récupération de tokens depuis **DexScreener**.
- Récupération des pools sur **PumpSwap** et **Meteora DLMM** via Shyft API.
- Lecture et stockage des **décimales de token** pour les conversions précises.
- Récupération des **prix des tokens** via Jupiter API.
- Gestion de fichiers locaux pour tokens et pools (`token.json`, `newpools.json`).
- Fonctions utilitaires : pause (`sleep/delay`), lecture/écriture de signaux, hashage de fichiers.
- Exemple de **quotation** sur Meteora DLMM.
- Support pour récupérer des **pools filtrés par liquidité minimale** et par DEX.

---

## Installation

Cloner le projet et installer **toutes les dépendances** en une seule commande :

```bash
git clone https://github.com/votre-utilisateur/solana-cross-dex-sdk.git
cd solana-cross-dex-sdk
npm install @solana/web3.js @solana/spl-token @raydium-io/raydium-sdk-v2 node-fetch bn.js dotenv bs58 @meteora-ag/dlmm
```

Configuration

Créez un fichier .env à la racine du projet avec vos informations sensibles :
# === Variables d'environnement ===
SECRET_KEY=
NODE_ENV=development
PORT=3000
RPC_URL=
COINGECKO_API=
MIN_USD_LIQUIDITY=100
INTERVAL_MINUTES=5
Amount=0.1
Amount_USDC=100
SLIPPAGE=100

SHYFT_RPC=
SHYFT_KEY=

⚠️ Ne partagez jamais vos clés secrètes publiquement.

Utilisation
Récupérer les pools PumpSwap pour un token
import { pummpswapPools } from './onchain.js';

const token = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const minReserves = 3;
const minPoolCount = 3;

const pools = await pummpswapPools(token, minReserves, minPoolCount);
console.log(pools);


Récupérer un swap quote sur Meteora DLMM
import { QuotationDlmm } from './meteora-dlmm.js';
import BN from 'bn.js';

const pool = "HTvjzsfX3yU6BUodCjZ5vZkUrAxMDTrBs3CJaq43ashR";
const amount = new BN(0.01 * 10 ** 9); // 0.01 SOL
const side = "buy";
const slippage = new BN(500); // Exemple: 0.05%

const quote = await QuotationDlmm(pool, amount, side, slippage);
console.log(quote);

Cross-dex quotation
import { Quotations } from './cross-dex.js';

const input = "So11111111111111111111111111111111111111112"; // SOL
const output = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
const amount = 100_000_000; // 100 USDC (6 decimals)
const slippage = 1; // 1%

const quote = await Quotations("raydium", input, output, amount, slippage);
console.log(quote);

Fichiers importants

dextools.ts : récupération des tokens et pools, gestion des fichiers locaux.

onchain.ts : récupération des pools PumpSwap/Meteora, lecture des comptes SPL et décimales.

meteora-dlmm.ts : fonctions de quotation et swap pour Meteora DLMM.

cross-dex.ts : abstraction pour récupérer les quotes sur différents DEX.

config.ts : configuration de la connexion Solana et des clés.

.env : variables sensibles à renseigner (clé secrète, RPC, API keys).


Roadmap

 Ajouter le swap effectif sur tous les DEX (PumpSwap, Raydium, Jupiter, Meteora).

 Créer un moteur cross-dex automatisé pour exécuter le meilleur trade.

 Ajouter la gestion des erreurs et des logs avancés.

 Intégrer une logique d’arbitrage sur les pools avec surveillance des réserves.

 Optimiser la récupération des pools et des prix en temps réel.


 License

MIT License © Aliou Ba

