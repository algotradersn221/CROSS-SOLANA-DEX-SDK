// Repository pour la gestion des tokens
import { BaseRepository } from './base-repository.js';
import { TokenInfo } from '@/types/index.js';

export interface TokenRepositoryInterface {
  getToken(address: string): Promise<TokenInfo | null>;
  getTokensBySymbol(symbol: string): Promise<TokenInfo[]>;
  getAllTokens(): Promise<TokenInfo[]>;
  updateTokenPrice(address: string, price: number): Promise<void>;
}

export class TokenRepository extends BaseRepository implements TokenRepositoryInterface {
  private tokens: Map<string, TokenInfo> = new Map();

  constructor() {
    super('token-repository');
  }

  async getToken(address: string): Promise<TokenInfo | null> {
    if (!this.validateAddress(address)) {
      throw this.createError('INVALID_TOKEN_ADDRESS', 'Adresse de token invalide');
    }

    return this.retry(async () => {
      return this.tokens.get(address) || null;
    });
  }

  async getTokensBySymbol(symbol: string): Promise<TokenInfo[]> {
    if (!symbol || symbol.trim().length === 0) {
      throw this.createError('INVALID_SYMBOL', 'Symbole de token invalide');
    }

    return this.retry(async () => {
      return Array.from(this.tokens.values())
        .filter(token => token.symbol.toLowerCase() === symbol.toLowerCase());
    });
  }

  async getAllTokens(): Promise<TokenInfo[]> {
    return this.retry(async () => {
      return Array.from(this.tokens.values());
    });
  }

  async updateTokenPrice(address: string, price: number): Promise<void> {
    if (!this.validateAddress(address)) {
      throw this.createError('INVALID_TOKEN_ADDRESS', 'Adresse de token invalide');
    }

    if (price < 0) {
      throw this.createError('INVALID_PRICE', 'Prix invalide');
    }

    return this.retry(async () => {
      const token = this.tokens.get(address);
      if (token) {
        token.price = price;
        this.tokens.set(address, token);
      }
    });
  }

  // Méthodes pour la gestion interne des tokens
  addToken(token: TokenInfo): void {
    this.tokens.set(token.address, token);
  }

  removeToken(address: string): void {
    this.tokens.delete(address);
  }

  clearTokens(): void {
    this.tokens.clear();
  }

  hasToken(address: string): boolean {
    return this.tokens.has(address);
  }
}
