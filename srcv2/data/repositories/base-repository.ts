// Repository de base avec pattern Repository
import { DexError } from '@/types/index.js';

export abstract class BaseRepository {
  protected readonly dexName: string;

  constructor(dexName: string) {
    this.dexName = dexName;
  }

  protected createError(code: string, message: string): DexError {
    return {
      code,
      message,
      dex: this.dexName as any,
      timestamp: new Date()
    };
  }

  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw this.createError(
            'MAX_RETRIES_EXCEEDED',
            `Opération échouée après ${maxAttempts} tentatives: ${lastError.message}`
          );
        }

        await this.sleep(delay * attempt);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateAddress(address: string): boolean {
    try {
      // Validation basique d'adresse Solana
      return address.length >= 32 && address.length <= 44;
    } catch {
      return false;
    }
  }

  protected validateAmount(amount: any): boolean {
    return amount && amount.gt && amount.gt(0);
  }
}
