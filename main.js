import fs from "node:fs/promises";
import os from "node:os";
import { Worker } from "node:worker_threads";

const WORKERS = Math.min(
  8,
  os.availableParallelism?.() ?? os.cpus().length
);

const BATCH_SIZE = 100;

let totalChecked = 0;
let totalFound = 0;

function randomkey(n){
	
	let hsl = '';
  for (let i=0; i < n; i++){
		const nil = Math.floor(Math.random() * 16);
		hsl += nil.toString(16);
	}
	
	return hsl;
}


console.log("BNB Hunter");
console.log("CPU:", os.availableParallelism?.() ?? os.cpus().length);
console.log("Workers:", WORKERS);
console.log("Batch size:", BATCH_SIZE);

const workers = [];



function generateBatch(){
  let batch = [];
  for (let i=0; i < BATCH_SIZE; i++){
		  batch.push(randomkey(64));
	}
  return batch;
}


for (let i = 0; i < WORKERS; i++) {
  const worker = new Worker(
    new URL("./worker.js", import.meta.url),
    {
      workerData: {
        workerId: i
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
      
      totalFound += message.results.length;

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
  const mybatch = generateBatch();
  worker.postMessage({
    type: "batch",
    keys: mybatch
  });
}

process.on("SIGINT", async () => {
  console.log("\nStopping workers...");

  await Promise.all(
    workers.map(worker => worker.terminate())
  );

  process.exit(0);
});
