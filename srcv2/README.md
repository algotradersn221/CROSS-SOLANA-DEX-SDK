# Solana Cross-DEX SDK v2

## Architecture

Le SDK v2 implémente une architecture en couches séparées :

```
srcv2/
├── api/                 # Couche API - Communication avec les APIs externes
│   ├── jupiter-api.ts
│   ├── raydium-api.ts
│   ├── pumpswap-api.ts
│   └── meteora-api.ts
├── business/            # Couche Business Logic - Logique métier
│   └── cross-dex-manager.ts
├── data/                # Couche Data - Gestion des données
│   └── repositories/
│       ├── base-repository.ts
│       ├── pool-repository.ts
│       └── token-repository.ts
├── services/            # Services dédiés pour chaque DEX
│   ├── jupiter/
│   ├── raydium/
│   ├── pumpswap/
│   └── meteora/
├── types/               # Types et interfaces centralisés
│   └── index.ts
├── utils/               # Utilitaires
│   ├── config-manager.ts
│   └── error-handler.ts
└── index.ts             # Point d'entrée principal
```

## Fonctionnalités

### ✅ Séparation des couches
- **API** : Communication avec les APIs externes (Jupiter, Raydium, etc.)
- **Business** : Logique métier et orchestration
- **Data** : Gestion des données avec pattern Repository

### ✅ Services dédiés par DEX
- `JupiterService` : Gestion des swaps Jupiter
- `RaydiumService` : Gestion des swaps Raydium
- `PumpSwapService` : Gestion des swaps PumpSwap
- `MeteoraService` : Gestion des swaps Meteora DLMM

### ✅ Pattern Repository
- `PoolRepository` : Gestion des pools
- `TokenRepository` : Gestion des tokens
- `BaseRepository` : Classe de base avec retry et validation

### ✅ Gestion d'erreurs centralisée
- `ErrorHandler` : Gestion centralisée des erreurs
- Types d'erreurs spécifiques par DEX
- Logging et statistiques d'erreurs

### ✅ Configuration sécurisée
- `ConfigManager` : Gestion sécurisée de la configuration
- Validation des variables d'environnement
- Configuration par DEX

## Utilisation

```typescript
import { SolanaCrossDexSdk, SwapParams } from '@/index.js';
import BN from 'bn.js';

// Initialisation
const sdk = new SolanaCrossDexSdk({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  wallet: {
    publicKey: new PublicKey('YOUR_WALLET_PUBLIC_KEY'),
    signTransaction: async (tx) => { /* implémentation */ }
  }
});

// Paramètres de swap
const params: SwapParams = {
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: new BN(1000000000), // 1 SOL en lamports
  slippage: 0.5 // 0.5%
};

// Récupérer la meilleure cotation
const bestQuote = await sdk.getBestQuote(params);
console.log('Meilleure cotation:', bestQuote);

// Récupérer toutes les cotations
const allQuotes = await sdk.getAllQuotes(params);
console.log('Toutes les cotations:', allQuotes);

// Exécuter le meilleur swap
const swapResult = await sdk.executeBestSwap(params);
console.log('Résultat du swap:', swapResult);
```

## Configuration

### Variables d'environnement requises

```env
RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PUBLIC_KEY=YOUR_WALLET_PUBLIC_KEY
SHYFT_KEY=YOUR_SHYFT_API_KEY
```

### Configuration par DEX

```typescript
// Activer/désactiver un DEX
sdk.setDexEnabled('jupiter', true);
sdk.setDexEnabled('raydium', false);

// Mettre à jour la configuration d'un DEX
sdk.updateDexConfig('jupiter', {
  rateLimit: { requests: 200, window: 60000 }
});
```

## Gestion d'erreurs

```typescript
try {
  const quote = await sdk.getBestQuote(params);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && 'dex' in error) {
    console.error(`Erreur ${error.dex}: ${error.message}`);
  }
}

// Récupérer les statistiques d'erreurs
const errorStats = sdk.getErrorStats();
console.log('Erreurs par DEX:', errorStats);

// Récupérer le log d'erreurs
const errorLog = sdk.getErrorLog();
console.log('Log d\'erreurs:', errorLog);
```

## Avantages de l'architecture v2

1. **Séparation des responsabilités** : Chaque couche a un rôle spécifique
2. **Testabilité** : Chaque composant peut être testé indépendamment
3. **Maintenabilité** : Code organisé et modulaire
4. **Extensibilité** : Facile d'ajouter de nouveaux DEX
5. **Sécurité** : Gestion sécurisée de la configuration
6. **Robustesse** : Gestion d'erreurs centralisée avec retry
7. **Performance** : Cache et optimisation des requêtes

## Migration depuis v1

Le SDK v2 est une refonte complète de l'architecture. Pour migrer :

1. Remplacer les imports par `@/index.js` (alias configuré dans tsconfig.json)
2. Utiliser `SolanaCrossDexSdk` au lieu des fonctions individuelles
3. Adapter la configuration avec `ConfigManager`
4. Utiliser la gestion d'erreurs centralisée

## Configuration des imports

Le projet utilise l'alias `@/` pour une meilleure lisibilité des imports :

```typescript
// Au lieu de
import { QuoteResult } from '../../../types/index.js';

// Utilisez
import { QuoteResult } from '@/types/index.js';
```

Les alias configurés dans `tsconfig.json` :
- `@/` → `srcv2/`
- `@/api/*` → `srcv2/api/*`
- `@/business/*` → `srcv2/business/*`
- `@/data/*` → `srcv2/data/*`
- `@/services/*` → `srcv2/services/*`
- `@/types/*` → `srcv2/types/*`
- `@/utils/*` → `srcv2/utils/*`

## Développement

### Structure des services

Chaque service DEX suit le même pattern :

```typescript
export class DexService {
  private readonly api: DexApi;
  private readonly poolRepository: PoolRepository;
  private readonly tokenRepository: TokenRepository;

  constructor(poolRepository, tokenRepository) {
    this.api = new DexApi();
    // ...
  }

  async getQuote(params: SwapParams): Promise<QuoteResult> {
    // Validation + API + Cache
  }

  async executeSwap(...): Promise<SwapResult> {
    // Exécution du swap
  }
}
```

### Ajout d'un nouveau DEX

1. Créer l'API dans `api/newdex-api.ts`
2. Créer le service dans `services/newdex/newdex-service.ts`
3. Ajouter le type dans `types/index.ts`
4. Intégrer dans `cross-dex-manager.ts`
5. Mettre à jour la configuration
