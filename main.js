import fs from "node:fs/promises";
import os from "node:os";
import { Worker } from "node:worker_threads";

const RPC = [
  "https://bsc.rpc.blxrbdn.com",
  "https://0.48.club",
  "https://bsc.blockrazor.xyz",
  "https://rpc-bsc.48.club"
];

const WORKERS = Math.min(
  8,
  os.availableParallelism?.() ?? os.cpus().length
);

const BATCH_SIZE = 1000;

const OUTPUT = "./output/check_bnb.txt";

let totalChecked = 0;
let totalFound = 0;

await fs.mkdir("./output", { recursive: true });

function randomkey(n){
	
	let hsl = '';
  for (let i=0; i < n; i++){
		const nil = Math.floor(Math.random() * 16);
		hsl += nil.toString(16);
	}
	
	return hsl;
}

let batches = [];


console.log("BNB Checker");
console.log("CPU:", os.availableParallelism?.() ?? os.cpus().length);
console.log("Workers:", WORKERS);
console.log("Batch size:", BATCH_SIZE);

let nextBatch = 0;

const workers = [];

function saveResults(results) {
  if (!results.length) return Promise.resolve();

  const lines = results.map(item =>
    `${item.address},${item.balance} BNB`
  );

  return fs.appendFile(
    OUTPUT,
    lines.join("\n") + "\n"
  );
}

function generateBatch(){
  nextBatch = 0;
      
  for (let i=0; i < BATCH_SIZE; i++){
		  batches.push(randomkey(64));
	}

}

generateBatch();

for (let i = 0; i < WORKERS; i++) {
  const worker = new Worker(
    new URL("./worker.js", import.meta.url),
    {
      workerData: {
        workerId: i,
        rpc: RPC
      }
    }
  );

  workers.push(worker);

  worker.on("message", async message => {
    if (message.type === "progress") {
      totalChecked++;
    }

    if (message.type === "error") {
      console.error(
        `Worker ${message.workerId}:`,
        message.message
      );
    }

    if (message.type === "batch-complete") {
      
      generateBatch();
    	
      totalFound += message.results.length;

      await saveResults(message.results);

      process.stdout.write(
        `Worker ${message.workerId}: ` +
        `${message.checked} checked, ` +
        `${message.results.length} found` + `                         \r\r`
      );

      sendNext(worker);
    }
  });

  worker.on("error", error => {
    console.error("Worker error:", error);
  });

  sendNext(worker);
}

function sendNext(worker) {

  worker.postMessage({
    type: "batch",
    keys: batches
  });
}

process.on("SIGINT", async () => {
  console.log("\nStopping workers...");

  await Promise.all(
    workers.map(worker => worker.terminate())
  );

  process.exit(0);
});
