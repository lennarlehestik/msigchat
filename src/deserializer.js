// eosHelper.js
import { Api, JsonRpc, Serialize } from 'eosjs';

const rpc = new JsonRpc('https://eos.eosusa.io', { fetch });
const api = new Api({ rpc, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

export const deserializeTransaction = async (packedTransaction) => {
  try {
    const packedTransactionArray = Serialize.hexToUint8Array(packedTransaction);
    const deserializedTransaction = await api.deserializeTransactionWithActions(packedTransactionArray);
    return deserializedTransaction;
  } catch (error) {
    console.error('Error deserializing transaction:', error);
    return null;
  }
};
