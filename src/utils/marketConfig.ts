import Decimal from 'decimal.js';
import { MarketsInformationModule } from '../perpetual/trading-client/markets-information-module';
import { EndpointConfig } from '../perpetual/configuration';

/**
 * Utility class for managing market configuration including min price/size changes.
 * Fetches market details to build configuration mappings.
 * 
 * Similar to SymbolConverter from lighter-sdk but for Extended Exchange markets.
 */
export class ExtendedMarketConfig {
  #marketsModule: MarketsInformationModule;
  #symbolToMinPriceChange = new Map<string, number>();
  #symbolToMinSizeChange = new Map<string, number>();
  #initialized = false;
  #initPromise?: Promise<void>;

  /**
   * Creates a new ExtendedMarketConfig instance.
   * Market data will be loaded lazily on first use via ensureInitialized.
   */
  constructor(endpointConfig: EndpointConfig, apiKey?: string) {
    this.#marketsModule = new MarketsInformationModule(endpointConfig, { apiKey });
  }

  /**
   * Ensures the MarketConfig is initialized by loading market data if needed.
   * This method is idempotent and safe to call multiple times.
   */
  async ensureInitialized(): Promise<void> {
    // Already initialized
    if (this.#initialized) return;

    // Already initializing, wait for it
    if (this.#initPromise) {
      await this.#initPromise;
      return;
    }

    // Start initialization
    this.#initPromise = this.reload();
    await this.#initPromise;
    this.#initialized = true;
  }

  /**
   * Reload market configuration from the API.
   * Useful for refreshing data when new markets are added.
   */
  async reload(): Promise<void> {
    const marketsResponse = await this.#marketsModule.getMarkets();
    
    if (!marketsResponse.data) {
      throw new Error('Failed to fetch markets data');
    }

    // Clear existing mappings
    this.#symbolToMinPriceChange.clear();
    this.#symbolToMinSizeChange.clear();

    // Process markets - store as numbers
    for (const market of marketsResponse.data) {
      this.#symbolToMinPriceChange.set(
        market.name, 
        parseFloat(market.tradingConfig.minPriceChange.toString())
      );
      this.#symbolToMinSizeChange.set(
        market.name, 
        parseFloat(market.tradingConfig.minOrderSizeChange.toString())
      );
    }
  }

  /**
   * Get minimum price change for a symbol.
   */
  async getMinPriceChange(symbol: string): Promise<number | undefined> {
    await this.ensureInitialized();
    return this.#symbolToMinPriceChange.get(symbol);
  }

  /**
   * Get minimum order size change for a symbol.
   */
  async getMinOrderSizeChange(symbol: string): Promise<number | undefined> {
    await this.ensureInitialized();
    return this.#symbolToMinSizeChange.get(symbol);
  }

  /**
   * Get all available market symbols.
   */
  async getSymbols(): Promise<string[]> {
    await this.ensureInitialized();
    return Array.from(this.#symbolToMinPriceChange.keys());
  }

  /**
   * Check if a symbol exists in the mappings.
   */
  async hasSymbol(symbol: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.#symbolToMinPriceChange.has(symbol);
  }
}
