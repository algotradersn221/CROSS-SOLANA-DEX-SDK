// Gestionnaire d'erreurs centralisé
import { DexError, DexType } from '@/types/index.js';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: DexError[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: any, dex: DexType, context?: string): DexError {
    let dexError: DexError;

    if (error && typeof error === 'object' && 'code' in error && 'dex' in error) {
      dexError = error as DexError;
    } else {
      dexError = {
        code: this.getErrorCode(error),
        message: this.getErrorMessage(error, context),
        dex,
        timestamp: new Date()
      };
    }

    // Log de l'erreur
    this.logError(dexError);

    // Logging console pour le développement
    console.error(`[${dex.toUpperCase()}] ${dexError.code}: ${dexError.message}`);

    return dexError;
  }

  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    if (error.name) return error.name.toUpperCase();
    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: any, context?: string): string {
    let message = error.message || error.toString();

    if (context) {
      message = `${context}: ${message}`;
    }

    return message;
  }

  private logError(error: DexError): void {
    this.errorLog.push(error);

    // Limiter la taille du log (garder seulement les 1000 dernières erreurs)
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }
  }

  getErrorLog(): DexError[] {
    return [...this.errorLog];
  }

  getErrorsByDex(dex: DexType): DexError[] {
    return this.errorLog.filter(error => error.dex === dex);
  }

  getErrorsByCode(code: string): DexError[] {
    return this.errorLog.filter(error => error.code === code);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getErrorStats(): Record<DexType, number> {
    const stats: Record<DexType, number> = {
      jupiter: 0,
      raydium: 0,
      pumpswap: 0,
      meteora: 0
    };

    this.errorLog.forEach(error => {
      stats[error.dex]++;
    });

    return stats;
  }

  // Méthodes utilitaires pour les erreurs courantes
  createNetworkError(dex: DexType, url: string): DexError {
    return {
      code: 'NETWORK_ERROR',
      message: `Erreur réseau lors de l'appel à ${url}`,
      dex,
      timestamp: new Date()
    };
  }

  createValidationError(dex: DexType, field: string, value: any): DexError {
    return {
      code: 'VALIDATION_ERROR',
      message: `Validation échouée pour ${field}: ${value}`,
      dex,
      timestamp: new Date()
    };
  }

  createRateLimitError(dex: DexType): DexError {
    return {
      code: 'RATE_LIMIT_ERROR',
      message: 'Limite de taux dépassée',
      dex,
      timestamp: new Date()
    };
  }

  createTimeoutError(dex: DexType, timeout: number): DexError {
    return {
      code: 'TIMEOUT_ERROR',
      message: `Timeout après ${timeout}ms`,
      dex,
      timestamp: new Date()
    };
  }
}
