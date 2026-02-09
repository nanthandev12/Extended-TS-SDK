/**
 * Account subscription with full state management
 * 
 * This subscription maintains the full account state (positions, orders, balance)
 * internally and emits complete snapshots on every update.
 */

import { PerpetualStreamConnection } from './perpetual-stream-connection';
import { WrappedStreamResponse } from '../../utils/http';
import { OrderStatus } from '../orders';

export interface AccountOrder {
  id: number;
  accountId: number;
  externalId: string;
  market: string;
  type: string;
  side: string;
  status: OrderStatus;
  price: string;
  qty: string;
  filledQty: string;
  cancelledQty: string;
  reduceOnly: boolean;
  postOnly: boolean;
  createdTime: number;
  updatedTime: number;
  expireTime: number;
  timeInForce: string;
  payedFee: string;
}

export interface AccountPosition {
  id: number;
  accountId: number;
  market: string;
  status: string;
  side: string;
  leverage: string;
  size: string;
  value: string;
  openPrice: string;
  markPrice: string;
  liquidationPrice: string;
  margin: string;
  unrealisedPnl: string;
  midPriceUnrealisedPnl: string;
  realisedPnl: string;
  adl?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AccountBalance {
  collateralName: string;
  balance: string;
  status: string;
  equity: string;
  spotEquity: string;
  spotEquityForAvailableForTrade: string;
  availableForTrade: string;
  availableForWithdrawal: string;
  unrealisedPnl: string;
  initialMargin: string;
  marginRatio: string;
  updatedTime: number;
  exposure: string;
  leverage: string;
}

export interface FullAccountSnapshot {
  positions: AccountPosition[];
  orders: AccountOrder[];
  balance: AccountBalance | null;
  timestamp: number;
  sequence: number;
}

export class AccountSubscription {
  private connection: PerpetualStreamConnection<any>;
  private positions: Map<number, AccountPosition> = new Map();
  private orders: Map<number, AccountOrder> = new Map();
  private balance: AccountBalance | null = null;
  private lastSequence: number = 0;
  private lastTimestamp: number = 0;


  // Order statuses to keep in the list
  private readonly ACTIVE_ORDER_STATUSES = new Set([
    OrderStatus.NEW,
    OrderStatus.UNTRIGGERED,
    OrderStatus.PARTIALLY_FILLED,
  ]);

  constructor(connection: PerpetualStreamConnection<any>) {
    this.connection = connection;
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

  private handleOrderSnapshot(orders: AccountOrder[]): void {
    this.orders.clear();
    for (const order of orders) {
      if (this.ACTIVE_ORDER_STATUSES.has(order.status)) {
        this.orders.set(order.id, order);
      }
    }
  }

  private handleOrderUpdate(orders: AccountOrder[]): void {
    for (const order of orders) {
      if (this.ACTIVE_ORDER_STATUSES.has(order.status)) {
        this.orders.set(order.id, order);
      } else {
        // Remove completed/cancelled/rejected orders
        this.orders.delete(order.id);
      }
    }
  }

  private handlePositionSnapshot(positions: AccountPosition[]): void {
    this.positions.clear();
    for (const position of positions) {
      if (position.status !== 'CLOSED') {
        this.positions.set(position.id, position);
      }
    }
  }

  private handlePositionUpdate(positions: AccountPosition[]): void {
    for (const position of positions) {
      if (position.status === 'CLOSED') {
        // Remove closed positions
        this.positions.delete(position.id);
      } else {
        this.positions.set(position.id, position);
      }
    }
  }

  private handleBalanceSnapshot(balance: AccountBalance): void {
    this.balance = balance;
  }

  private handleBalanceUpdate(balance: AccountBalance): void {
    this.balance = balance;
  }

  private buildSnapshot(): FullAccountSnapshot {
    return {
      positions: Array.from(this.positions.values()),
      orders: Array.from(this.orders.values()),
      balance: this.balance,
      timestamp: this.lastTimestamp,
      sequence: this.lastSequence,
    };
  }

  async *[Symbol.asyncIterator](): AsyncIterator<FullAccountSnapshot> {
    while (!this.isClosed()) {
      try {
        const event: WrappedStreamResponse<any> = await this.connection.recv();

        if (event.ts) {
          this.lastTimestamp = event.ts;
        }
        if (event.seq) {
          this.lastSequence = event.seq;
        }

        if (!event.data) {
          continue;
        }

        const isSnapshot = event.data.isSnapshot === true;

        // Handle different event types
        if (event.type === 'ORDER') {
          const orders = event.data.orders || [];
          if (isSnapshot) {
            this.handleOrderSnapshot(orders);
          } else {
            this.handleOrderUpdate(orders);
            yield this.buildSnapshot();
          }
        } else if (event.type === 'POSITION') {
          const positions = event.data.positions || [];
          if (isSnapshot) {
            this.handlePositionSnapshot(positions);
            yield this.buildSnapshot();
          } else {
            this.handlePositionUpdate(positions);
            yield this.buildSnapshot();
          }
        } else if (event.type === 'BALANCE') {
          const balance = event.data.balance;
          if (balance) {
            if (isSnapshot) {
              this.handleBalanceSnapshot(balance);
            } else {
              this.handleBalanceUpdate(balance);
              yield this.buildSnapshot();
            }
          }
        }
      } catch (error) {
        break;
      }
    }
  }

  getPositions(): AccountPosition[] {
    return Array.from(this.positions.values());
  }

  getOrders(): AccountOrder[] {
    return Array.from(this.orders.values());
  }

  getBalance(): AccountBalance | null {
    return this.balance;
  }

  getPosition(market: string): AccountPosition | undefined {
    return Array.from(this.positions.values()).find(p => p.market === market);
  }

  getOrdersByMarket(market: string): AccountOrder[] {
    return Array.from(this.orders.values()).filter(o => o.market === market);
  }
}
