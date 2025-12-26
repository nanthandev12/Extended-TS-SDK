/**
 * Perpetual stream client for WebSocket streaming
 */

import { PerpetualStreamConnection } from './perpetual-stream-connection';
import { OrderbookSubscription } from './orderbook-subscription';
import { AccountSubscription } from './account-subscription';
import { WrappedStreamResponse } from '../../utils/http';
import { getUrl } from '../../utils/http';

/**
 * Perpetual Stream Client for X10 WebSocket v1
 */
export class PerpetualStreamClient {
  private apiUrl: string;

  constructor(options: { apiUrl: string }) {
    this.apiUrl = options.apiUrl;
  }

  /**
   * Subscribe to orderbooks stream with full state management
   * https://api.docs.extended.exchange/#orderbooks-stream
   * 
   * Returns an OrderbookSubscription that maintains full orderbook state
   * and emits complete snapshots on every update (no need to handle deltas).
   */
  subscribeToOrderbooks(options: {
    marketName?: string;
    depth?: number;
  } = {}): OrderbookSubscription {
    const path = options.marketName
      ? `/orderbooks/<market>`
      : '/orderbooks';
    
    const url = getUrl(`${this.apiUrl}${path}`, {
      pathParams: options.marketName ? { market: options.marketName } : undefined,
      query: options.depth ? { depth: options.depth.toString() } : undefined,
    });

    const connection = new PerpetualStreamConnection(url);
    return new OrderbookSubscription(connection, options.marketName);
  }

  /**
   * Subscribe to orderbooks stream (raw connection, returns SNAPSHOT/DELTA as-is)
   * https://api.docs.extended.exchange/#orderbooks-stream
   * 
   * Use this if you want to handle SNAPSHOT/DELTA updates yourself.
   * For most use cases, prefer subscribeToOrderbooks() which manages state for you.
   */
  subscribeToOrderbooksRaw(options: {
    marketName?: string;
    depth?: number;
  } = {}): PerpetualStreamConnection<any> {
    const path = options.marketName
      ? `/orderbooks/<market>`
      : '/orderbooks';
    
    const url = getUrl(`${this.apiUrl}${path}`, {
      pathParams: options.marketName ? { market: options.marketName } : undefined,
      query: options.depth ? { depth: options.depth.toString() } : undefined,
    });

    return new PerpetualStreamConnection(url);
  }

  /**
   * Subscribe to public trades stream
   * https://api.docs.extended.exchange/#trades-stream
   */
  subscribeToPublicTrades(marketName?: string): PerpetualStreamConnection<any> {
    const path = marketName ? '/publicTrades/<market>' : '/publicTrades';
    const url = getUrl(`${this.apiUrl}${path}`, {
      pathParams: marketName ? { market: marketName } : undefined,
    });

    return new PerpetualStreamConnection(url);
  }

  /**
   * Subscribe to funding rates stream
   * https://api.docs.extended.exchange/#funding-rates-stream
   */
  subscribeToFundingRates(marketName?: string): PerpetualStreamConnection<any> {
    const path = marketName ? '/funding/<market>' : '/funding';
    const url = getUrl(`${this.apiUrl}${path}`, {
      pathParams: marketName ? { market: marketName } : undefined,
    });

    return new PerpetualStreamConnection(url);
  }

  /**
   * Subscribe to candles stream
   * https://api.docs.extended.exchange/#candles-stream
   */
  subscribeToCandles(options: {
    marketName: string;
    candleType: string;
    interval: string;
  }): PerpetualStreamConnection<any> {
    const url = getUrl(`${this.apiUrl}/candles/<market>/<candle_type>`, {
      pathParams: {
        market: options.marketName,
        candle_type: options.candleType,
      },
      query: {
        interval: options.interval,
      },
    });

    return new PerpetualStreamConnection(url);
  }

  /**
   * Subscribe to account updates stream with full state management
   * https://api.docs.extended.exchange/#account-updates-stream
   * 
   * Returns an AccountSubscription that maintains full account state
   * (positions, orders, balance) and emits complete snapshots on every update.
   */
  subscribeToAccountUpdates(apiKey: string): AccountSubscription {
    const url = getUrl(`${this.apiUrl}/account`, {});
    const connection = new PerpetualStreamConnection(url, apiKey);
    return new AccountSubscription(connection);
  }

  /**
   * Subscribe to account updates stream (raw connection, returns events as-is)
   * https://api.docs.extended.exchange/#account-updates-stream
   * 
   * Use this if you want to handle snapshots/deltas yourself.
   * For most use cases, prefer subscribeToAccountUpdates() which manages state for you.
   */
  subscribeToAccountUpdatesRaw(apiKey: string): PerpetualStreamConnection<any> {
    const url = getUrl(`${this.apiUrl}/account`, {});
    return new PerpetualStreamConnection(url, apiKey);
  }
}










