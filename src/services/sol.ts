import { Connection } from '@solana/web3.js';
const connection = new Connection(process.env.SOLANA_RPC_URL || '');

export async function sendSignedTransaction(rawSignedTx: Buffer) {
  const txid = await connection.sendRawTransaction(rawSignedTx);
  await connection.confirmTransaction(txid, 'finalized');
  return txid;
}
