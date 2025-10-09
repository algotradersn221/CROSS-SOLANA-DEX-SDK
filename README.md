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
```bash
Configuration

Créez un fichier .env à la racine du projet avec vos informations sensibles :
