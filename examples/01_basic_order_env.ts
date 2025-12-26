/**
 * Basic order placement example using environment variables
 */

import {
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  StarkPerpetualAccount,
  PerpetualTradingClient,
  OrderSide,
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
    const order = await client.placeOrder({
      marketName: 'BTC-USD',
      amountOfSynthetic: new Decimal('0.0001'),
      price: new Decimal('90000'),
      side: OrderSide.SELL,
      // Optional safety on mainnet: uncomment to avoid taking liquidity
      // postOnly: true,
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


