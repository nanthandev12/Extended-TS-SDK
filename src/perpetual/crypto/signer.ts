/**
 * StarkNet crypto signer using @scure/starknet
 * 
 * This module provides cryptographic operations for StarkNet using the
 * @scure/starknet library - a pure TypeScript implementation that works
 * in both Node.js and browser environments without any build steps.
 */

import * as starknet from '@scure/starknet';

// Type selectors for Poseidon hashing (from WASM implementation)
const STARKNET_DOMAIN_SELECTOR = BigInt('0x1ff2f602e42168014d405a94f75e8a93d640751d71d16311266e140d8b0a210');
const ORDER_SELECTOR = BigInt('0x36da8d51815527cabfaa9c982f564c80fa7429616739306036f1f9b608dd112');
const TRANSFER_ARGS_SELECTOR = BigInt('0x1db88e2709fdf2c59e651d141c3296a42b209ce770871b40413ea109846a3b4');
const WITHDRAWAL_ARGS_SELECTOR = BigInt('0x250a5fa378e8b771654bd43dcb34844534f9d1e29e16b14760d7936ea7f4b1d');

// Convert Cairo short string to field element (max 31 chars, big-endian ASCII)
function cairoShortStringToFelt(s: string): bigint {
  if (s.length > 31) throw new Error('String too long for Cairo short string (max 31 chars)');
  const bytes = new TextEncoder().encode(s);
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

// Hash StarkNet domain using Poseidon
function hashStarknetDomain(name: string, version: string, chainId: string, revision: number): bigint {
  return starknet.poseidonHashMany([
    STARKNET_DOMAIN_SELECTOR,
    cairoShortStringToFelt(name),
    cairoShortStringToFelt(version),
    cairoShortStringToFelt(chainId),
    BigInt(revision)
  ]);
}

/**
 * Sign a message hash using StarkNet ECDSA
 * @param privateKey - StarkNet private key as BigInt
 * @param msgHash - Message hash as BigInt
 * @returns Signature tuple [r, s]
 */
export function sign(privateKey: bigint, msgHash: bigint): [bigint, bigint] {
  const privKeyHex = '0x' + privateKey.toString(16).padStart(64, '0');
  const msgHashHex = '0x' + msgHash.toString(16).padStart(64, '0');
  const signature = starknet.sign(msgHashHex, privKeyHex);
  return [signature.r, signature.s];
}

/**
 * Compute Pedersen hash of two field elements
 * 
 * Pedersen hash is used extensively in StarkNet for hashing operations.
 * Compatible with Extended Exchange API.
 * 
 * @param a - First field element as BigInt
 * @param b - Second field element as BigInt
 * @returns Pedersen hash as BigInt
 * 
 * @example
 * ```typescript
 * const hash = pedersenHash(BigInt('0x123'), BigInt('0x456'));
 * ```
 */
export function pedersenHash(a: bigint, b: bigint): bigint {
  // @scure/starknet.pedersen returns hex string
  const resultHex = starknet.pedersen(a, b);
  return BigInt(resultHex);
}

/**
 * Generate StarkNet keypair from Ethereum signature (for onboarding)
 * @param ethSignature - Ethereum signature as hex string (65 bytes)
 * @returns Tuple [privateKey, publicKey] as BigInt
 * const [privateKey, publicKey] = generateKeypairFromEthSignature(ethSig);
 * ```
 */
export function generateKeypairFromEthSignature(ethSignature: string): [bigint, bigint] {
  const privateKeyHex = starknet.ethSigToPrivate(ethSignature);
  const publicKeyHex = starknet.getStarkKey(privateKeyHex);
  return [BigInt(privateKeyHex), BigInt(publicKeyHex)];
}

/**
 * Generate order message hash for signing
 * @param params - Order parameters
 * @returns Message hash as BigInt
 */
export function getOrderMsgHash(params: {
  positionId: number;
  baseAssetId: string;
  baseAmount: string;
  quoteAssetId: string;
  quoteAmount: string;
  feeAmount: string;
  feeAssetId: string;
  expiration: number;
  salt: number;
  userPublicKey: string;
  domainName: string;
  domainVersion: string;
  domainChainId: string;
  domainRevision: string;
}): bigint {
  const orderHash = starknet.poseidonHashMany([
    ORDER_SELECTOR,
    BigInt(params.positionId),
    BigInt(params.baseAssetId),
    BigInt(params.baseAmount),
    BigInt(params.quoteAssetId),
    BigInt(params.quoteAmount),
    BigInt(params.feeAssetId),
    BigInt(params.feeAmount),
    BigInt(params.expiration),
    BigInt(params.salt)
  ]);
  
  const domainHash = hashStarknetDomain(
    params.domainName,
    params.domainVersion,
    params.domainChainId,
    parseInt(params.domainRevision)
  );
  
  return starknet.poseidonHashMany([
    cairoShortStringToFelt('StarkNet Message'),
    domainHash,
    BigInt(params.userPublicKey),
    orderHash
  ]);
}

/**
 * Generate transfer message hash for signing
 * @param params - Transfer parameters
 * @returns Message hash as BigInt
 */
export function getTransferMsgHash(params: {
  recipientPositionId: number;
  senderPositionId: number;
  amount: string;
  expiration: number;
  salt: string;
  userPublicKey: string;
  domainName: string;
  domainVersion: string;
  domainChainId: string;
  domainRevision: string;
  collateralId: string;
}): bigint {
  const transferHash = starknet.poseidonHashMany([
    TRANSFER_ARGS_SELECTOR,
    BigInt(params.recipientPositionId),
    BigInt(params.senderPositionId),
    BigInt(params.collateralId),
    BigInt(params.amount),
    BigInt(params.expiration),
    BigInt(params.salt)
  ]);
  
  const domainHash = hashStarknetDomain(
    params.domainName,
    params.domainVersion,
    params.domainChainId,
    parseInt(params.domainRevision)
  );
  
  return starknet.poseidonHashMany([
    cairoShortStringToFelt('StarkNet Message'),
    domainHash,
    BigInt(params.userPublicKey),
    transferHash
  ]);
}

/**
 * Generate withdrawal message hash for signing
 * @param params - Withdrawal parameters
 * @returns Message hash as BigInt
 */
export function getWithdrawalMsgHash(params: {
  recipientHex: string;
  positionId: number;
  amount: string;
  expiration: number;
  salt: string;
  userPublicKey: string;
  domainName: string;
  domainVersion: string;
  domainChainId: string;
  domainRevision: string;
  collateralId: string;
}): bigint {
  const withdrawalHash = starknet.poseidonHashMany([
    WITHDRAWAL_ARGS_SELECTOR,
    BigInt(params.recipientHex),
    BigInt(params.positionId),
    BigInt(params.collateralId),
    BigInt(params.amount),
    BigInt(params.expiration),
    BigInt(params.salt)
  ]);
  
  const domainHash = hashStarknetDomain(
    params.domainName,
    params.domainVersion,
    params.domainChainId,
    parseInt(params.domainRevision)
  );
  
  return starknet.poseidonHashMany([
    cairoShortStringToFelt('StarkNet Message'),
    domainHash,
    BigInt(params.userPublicKey),
    withdrawalHash
  ]);
}

