/**
 * Basic order placement example using environment variables
 */

import {
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  StarkPerpetualAccount,
  PerpetualTradingClient,
  OrderSide,
  TimeInForce,
} from '../src/index';
import { getX10EnvConfig } from '../src/utils/env';
import Decimal from 'decimal.js';

async function main() {

  // Load environment configuration
  const env = getX10EnvConfig(true);
  const config = env.environment === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;

  console.log('Creating account...');
  const account = new StarkPerpetualAccount(
    env.vaultId,
    env.privateKey,
    env.publicKey,
    env.apiKey
  );

  console.log('Creating trading client...');
  const client = new PerpetualTradingClient(config, account);

  try {
    // Get balance
    console.log('\nFetching balance...');
    const balanceResponse = await client.account.getBalance();
    if (balanceResponse.data) {
      console.log('Balance:', JSON.stringify(balanceResponse.data));
    }

    // Get positions
    console.log('\nFetching positions...');
    const positionsResponse = await client.account.getPositions();
    if (positionsResponse.data) {
      console.log('Positions:', positionsResponse.data.length, 'open');
    }

    // Get open orders
    console.log('\nFetching open orders...');
    const ordersResponse = await client.account.getOpenOrders();
    if (ordersResponse.data) {
      console.log('Open orders:', ordersResponse.data.length);
    }

    // Get markets
    console.log('\nFetching markets...');
    const marketsResponse = await client.marketsInfo.getMarkets();
    if (marketsResponse.data) {
      console.log('Available markets count:', marketsResponse.data.length);
    }

    // Place a test order (small amount)
    console.log('\nPlacing test order...');
    
    // Generate client order ID (same as bot)
    const generateClientOrderId = () => {
      const bytes: number[] = [];
      for (let i = 0; i < 16; i++) {
        bytes.push(Math.floor(Math.random() * 256));
      }
      const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
      return `0x${hex}`;
    };
    
    const cloid = generateClientOrderId();
    console.log('Client Order ID:', cloid);
    
    const order = await client.placeOrder({
      marketName: 'ETH-USD',
      amountOfSynthetic: new Decimal('0.0005'),  // Same as bot hedge size
      price: new Decimal('2598.1'),             // Rounded to valid precision
      side: OrderSide.BUY,                      // Bot uses BUY for LONG hedge
      postOnly: false,                          // Bot passes this
      externalId: cloid,                        // Bot passes this
      reduceOnly: false,                        // Bot passes this
      timeInForce: TimeInForce.GTT,             // Bot maps to GTT by default
    });

    if (order.data) {
      console.log('Order placed successfully!');
      console.log('Order ID:', order.data.id);
      console.log('Order:', JSON.stringify(order.data));

      // Cancel the order (Note: Large order IDs require externalId for reliability)
      console.log('\nCanceling order...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for order to propagate
      
      // Get all open orders and find ours by ID
      const openOrders = await client.account.getOpenOrders();
      const ourOrder = openOrders.data?.find(o => o.id.toString() === order.data!.id.toString());
      
      if (ourOrder && ourOrder.externalId) {
        const cancelResult = await client.orders.cancelOrderByExternalId(ourOrder.externalId);
        
        if (cancelResult.error) {
          console.error('Failed to cancel:', cancelResult.error);
        } else {
          console.log('Order canceled successfully!');
        }
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  } finally {
    // Cleanup
    await client.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


