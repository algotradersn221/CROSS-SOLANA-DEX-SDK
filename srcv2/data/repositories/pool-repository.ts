// Repository pour la gestion des pools
import { BaseRepository } from './base-repository.js';
import { PoolInfo, DexType } from '@/types/index.js';

export interface PoolRepositoryInterface {
  getPoolsByToken(tokenAddress: string, minLiquidity?: number): Promise<PoolInfo[]>;
  getPoolByAddress(poolAddress: string): Promise<PoolInfo | null>;
  getPoolsByDex(dex: DexType, tokenAddress?: string): Promise<PoolInfo[]>;
}

export class PoolRepository extends BaseRepository implements PoolRepositoryInterface {
  private pools: Map<string, PoolInfo> = new Map();

  constructor() {
    super('pool-repository');
  }

  async getPoolsByToken(tokenAddress: string, minLiquidity: number = 0): Promise<PoolInfo[]> {
    if (!this.validateAddress(tokenAddress)) {
      throw this.createError('INVALID_TOKEN_ADDRESS', 'Adresse de token invalide');
    }

    return this.retry(async () => {
      const pools = Array.from(this.pools.values())
        .filter(pool =>
          pool.baseMint === tokenAddress || pool.quoteMint === tokenAddress
        )
        .filter(pool => !minLiquidity || (pool.liquidity && pool.liquidity >= minLiquidity));

      return pools;
    });
  }

  async getPoolByAddress(poolAddress: string): Promise<PoolInfo | null> {
    if (!this.validateAddress(poolAddress)) {
      throw this.createError('INVALID_POOL_ADDRESS', 'Adresse de pool invalide');
    }

    return this.retry(async () => {
      return this.pools.get(poolAddress) || null;
    });
  }

  async getPoolsByDex(dex: DexType, tokenAddress?: string): Promise<PoolInfo[]> {
    return this.retry(async () => {
      let pools = Array.from(this.pools.values())
        .filter(pool => pool.dexId === dex);

      if (tokenAddress) {
        pools = pools.filter(pool =>
          pool.baseMint === tokenAddress || pool.quoteMint === tokenAddress
        );
      }

      return pools;
    });
  }

  // Méthodes pour la gestion interne des pools
  addPool(pool: PoolInfo): void {
    this.pools.set(pool.poolAddress, pool);
  }

  removePool(poolAddress: string): void {
    this.pools.delete(poolAddress);
  }

  clearPools(): void {
    this.pools.clear();
  }

  getAllPools(): PoolInfo[] {
    return Array.from(this.pools.values());
  }
}
