/**
 * Orderbook subscription with full state management
 * 
 * This subscription maintains the full orderbook state internally and emits
 * complete snapshots on every update, eliminating the need for consumers
 * to manually apply delta updates.
 */

import Decimal from 'decimal.js';
import { PerpetualStreamConnection } from './perpetual-stream-connection';
import { OrderbookUpdateModel, OrderbookQuantityModel } from '../orderbooks';
import { WrappedStreamResponse } from '../../utils/http';

export interface OrderbookEntry {
  price: Decimal;
  qty: Decimal;
}

export interface FullOrderbookSnapshot {
  market: string;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp: number;
  sequence: number;
}

export class OrderbookSubscription {
  private connection: PerpetualStreamConnection<any>;
  private bidLevels: Map<string, OrderbookEntry> = new Map();
  private askLevels: Map<string, OrderbookEntry> = new Map();
  private marketName: string;
  private lastSequence: number = 0;
  private lastTimestamp: number = 0;

  constructor(connection: PerpetualStreamConnection<any>, marketName: string) {
    this.connection = connection;
    this.marketName = marketName;
  }

  async connect(): Promise<this> {
    await this.connection.connect();
    return this;
  }

  async close(): Promise<void> {
    await this.connection.close();
  }

  isClosed(): boolean {
    return this.connection.isClosed();
  }

  private initOrderbook(data: OrderbookUpdateModel): void {
    this.bidLevels.clear();
    this.askLevels.clear();

    for (const bid of data.bid) {
      this.bidLevels.set(bid.price.toString(), {
        price: bid.price,
        qty: bid.qty,
      });
    }

    for (const ask of data.ask) {
      this.askLevels.set(ask.price.toString(), {
        price: ask.price,
        qty: ask.qty,
      });
    }
  }

  private updateOrderbook(data: OrderbookUpdateModel): void {
    for (const bid of data.bid) {
      const priceKey = bid.price.toString();
      const existing = this.bidLevels.get(priceKey);

      if (existing) {
        const newQty = existing.qty.plus(bid.qty);
        if (newQty.isZero()) {
          this.bidLevels.delete(priceKey);
        } else {
          existing.qty = newQty;
        }
      } else {
        if (!bid.qty.isZero()) {
          this.bidLevels.set(priceKey, {
            price: bid.price,
            qty: bid.qty,
          });
        }
      }
    }

    for (const ask of data.ask) {
      const priceKey = ask.price.toString();
      const existing = this.askLevels.get(priceKey);

      if (existing) {
        const newQty = existing.qty.plus(ask.qty);
        if (newQty.isZero()) {
          this.askLevels.delete(priceKey);
        } else {
          existing.qty = newQty;
        }
      } else {
        if (!ask.qty.isZero()) {
          this.askLevels.set(priceKey, {
            price: ask.price,
            qty: ask.qty,
          });
        }
      }
    }
  }

  private buildSnapshot(): FullOrderbookSnapshot {
    const bids = Array.from(this.bidLevels.values())
      .sort((a, b) => b.price.comparedTo(a.price));

    const asks = Array.from(this.askLevels.values())
      .sort((a, b) => a.price.comparedTo(b.price));

    return {
      market: this.marketName,
      bids,
      asks,
      timestamp: this.lastTimestamp,
      sequence: this.lastSequence,
    };
  }

  async *[Symbol.asyncIterator](): AsyncIterator<FullOrderbookSnapshot> {
    while (!this.isClosed()) {
      try {
        const event: WrappedStreamResponse<any> = await this.connection.recv();

        if (event.ts) {
          this.lastTimestamp = event.ts;
        }
        if (event.seq) {
          this.lastSequence = event.seq;
        }

        if (event.type === 'SNAPSHOT' && event.data) {
          const orderbookData = this.parseOrderbookData(event.data);
          if (orderbookData) {
            this.initOrderbook(orderbookData);
            yield this.buildSnapshot();
          }
        } else if (event.type === 'DELTA' && event.data) {
          const orderbookData = this.parseOrderbookData(event.data);
          if (orderbookData) {
            this.updateOrderbook(orderbookData);
            yield this.buildSnapshot();
          }
        }
      } catch (error) {
        break;
      }
    }
  }

  private parseOrderbookData(data: any): OrderbookUpdateModel | null {
    if (!data.m || !data.b || !data.a) {
      return null;
    }

    const bids = data.b.map((b: any) => new OrderbookQuantityModel(
      new Decimal(b.q),
      new Decimal(b.p)
    ));

    const asks = data.a.map((a: any) => new OrderbookQuantityModel(
      new Decimal(a.q),
      new Decimal(a.p)
    ));

    return new OrderbookUpdateModel(data.m, bids, asks);
  }

  bestBid(): OrderbookEntry | null {
    if (this.bidLevels.size === 0) {
      return null;
    }

    let best: OrderbookEntry | null = null;
    for (const entry of this.bidLevels.values()) {
      if (!best || entry.price.greaterThan(best.price)) {
        best = entry;
      }
    }
    return best;
  }

  bestAsk(): OrderbookEntry | null {
    if (this.askLevels.size === 0) {
      return null;
    }

    let best: OrderbookEntry | null = null;
    for (const entry of this.askLevels.values()) {
      if (!best || entry.price.lessThan(best.price)) {
        best = entry;
      }
    }
    return best;
  }

  getMidPrice(): Decimal | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();

    if (!bid || !ask) {
      return null;
    }

    return bid.price.plus(ask.price).dividedBy(2);
  }
}
