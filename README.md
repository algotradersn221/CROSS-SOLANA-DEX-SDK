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

