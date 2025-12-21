/**
 * Market order example using environment variables
 * Uses IOC (Immediate or Cancel) time in force to create market orders
 */

import {
  initWasm,
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  PerpetualTradingClient,
  OrderSide,
  TimeInForce,
} from '../src/index';
import { getX10EnvConfig } from '../src/utils/env';
import Decimal from 'decimal.js';

async function main() {
  console.log('Initializing WASM...');
  await initWasm();

  const env = getX10EnvConfig(true);
  const config = env.environment === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;

  const { StarkPerpetualAccount } = await import('../src/index');
  const account = new StarkPerpetualAccount(env.vaultId, env.privateKey, env.publicKey, env.apiKey);
  const client = new PerpetualTradingClient(config, account);

  try {
    const marketName = 'BTC-USD';
    
    // Get current market price for reference
    let referencePrice = new Decimal('60000'); // Fallback
    try {
      const orderbook = await client.marketsInfo.getOrderbookSnapshot(marketName);
      if (orderbook.data) {
        if (orderbook.data.asks && orderbook.data.asks.length > 0 && orderbook.data.asks[0].length > 0) {
          referencePrice = new Decimal(orderbook.data.asks[0][0]); // Use best ask for buy orders
        }
      }
    } catch (e) {
      console.log('Could not fetch orderbook, using fallback price');
    }

    const qty = new Decimal('0.0001'); // Very small size to minimize cost
    console.log(`\nPlacing MARKET BUY order on ${marketName}...`);
    console.log(`Quantity: ${qty.toString()}, Reference price: ${referencePrice.toString()}`);
    console.log('Note: Market orders use IOC (Immediate or Cancel) time in force');
    
    // Market order: Use IOC time in force and reference price
    // The order will execute immediately at market price or cancel
    const order = await client.placeOrder({
      marketName,
      amountOfSynthetic: qty,
      price: referencePrice, // Reference price for market orders
      side: OrderSide.BUY,
      timeInForce: TimeInForce.IOC, // IOC makes it a market order
      reduceOnly: false,
    });

    if (order.data) {
      console.log('Market order placed successfully!');
      console.log('Order ID:', order.data.id);
      console.log('Order status:', order.data.status);
      console.log('Order details:', JSON.stringify(order.data, null, 2));
    } else {
      console.log('Order response:', order);
    }
  } catch (error: any) {
    console.error('Error placing market order:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

