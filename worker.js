import { parentPort, workerData } from "node:worker_threads";
import { Web3 } from "web3";

const web3 = new Web3();

const RPC = workerData.rpc;
const BATCH_SIZE = 1000;

let rpcIndex = workerData.workerId % RPC.length;

function getAddress(privateKey) {
  return web3.eth.accounts.privateKeyToAccount('0x' +  privateKey).address; 
}

async function getBalance(address) {
  let lastError;

  for (let i = 0; i < RPC.length; i++) {
    const endpoint = RPC[rpcIndex++ % RPC.length];

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [address, "latest"],
          id: 1
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      return BigInt(result.result);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function formatBNB(value) {
  const unit = 10n ** 18n;
  const whole = value / unit;
  const fraction = (value % unit)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");

  return fraction
    ? `${whole}.${fraction}`
    : whole.toString();
}

async function processBatch(keys) {
  const results = [];

  for (const privateKey of keys) {
    try {
      const address = getAddress(privateKey);
      const balance = await getBalance(address);

      if (balance > 0n) {
        results.push({
          address,
          balance: formatBNB(balance)
        });
      }

      parentPort.postMessage({
        type: "progress",
        workerId: workerData.workerId
      });

    } catch (error) {
      parentPort.postMessage({
        type: "error",
        workerId: workerData.workerId,
        message: error.message
      });
    }
  }

  parentPort.postMessage({
    type: "batch-complete",
    workerId: workerData.workerId,
    checked: keys.length,
    results
  });
}

parentPort.on("message", async message => {
  if (message.type === "batch") {
    await processBatch(message.keys);
  }
});
