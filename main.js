import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';
import fs from "node:fs/promises";
import os from "node:os";
import { Worker } from "node:worker_threads";
import crypto from "crypto";

let FOUND_ADDRS = [];

let TOTAL_TASKS = 0;
let TOTAL_ON = 0;
let TOTAL_FAIL = 0;
let FOUND_IND = 0;

const BAR_SIZE = 24;
const MAX_WORKERS = 64;

let WORKERS = 2;
let BATCH_SIZE = 100;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const startTime = Date.now();

const COLORS = (() => {
    const palette = [];

    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
 
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;

                if (brightness >= 3.0) {
                    const colorCode = 16 + (36 * r) + (6 * g) + b;
                    palette.push(colorCode);
                }
            }
        }
    }


    for (let i = palette.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [palette[i], palette[j]] = [palette[j], palette[i]];
    }

    return palette
        .slice(0, MAX_WORKERS)
        .map(color => `\x1b[38;5;${color}m`);
})();


const rl = readline.createInterface({ input, output });

async function askWorkerCount() {
    while (true) {
        const answer = await rl.question('Masukkan jumlah worker (1-64): ');
        const count = Number(answer);

        if (
            Number.isInteger(count) &&
            count >= 1 &&
            count <= 64
        ) {
            rl.close();
            return count;
        }

        console.log('Input tidak valid! Masukkan angka antara 1-64.');
    }
}

WORKERS = await askWorkerCount();

const activities = [];

for (let i = 0; i < WORKERS; i++) {

	activities.push(
		{	
			id : i+1,
			color : COLORS[i],
			checked : 0,
			fail: 0,
			toton: 0,			
			totfail: 0,
			totall: 0,
			results: {}
		}
	);
}


const rl2 = readline.createInterface({ input, output });

async function askWorkerTASK() {
    while (true) {
        const answer = await rl2.question('Masukkan jumlah address (10-10.000): ');
        const count = Number(answer);

        if (
            Number.isInteger(count) &&
            count >= 10 &&
            count <= 10000
        ) {
            rl2.close();
            return count;
        }

        console.log('Input tidak valid! Masukkan angka antara 10-10.000');
    }
}

BATCH_SIZE = await askWorkerTASK();

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return [h, m, s]
        .map(v => String(v).padStart(2, '0'))
        .join(':');
}

function progressBar(percent, color) {
    const filled = Math.round(
        BAR_SIZE * percent / 100
    );

    const empty = BAR_SIZE - filled;

    return (
        color +
        '█'.repeat(filled) +
        RESET +
        DIM +
        '░'.repeat(empty) +
        RESET
    );
}

function render() {

    const uptime = (Date.now() - startTime) / 1000;
	
	if(FOUND_ADDRS.length > 0){
		if(Math.round(uptime) % 4 == 0){
			FOUND_IND++;
			if(FOUND_IND > FOUND_ADDRS.length - 1){
				FOUND_IND = 0;
			}
		}
	}

    const speed = uptime > 0
        ? (TOTAL_TASKS / uptime).toFixed(0)
        : '0.0';

    const lines = [];

    lines.push(
        `${BOLD}\x1b[36m╔════════════════════════════════════════════════════════════════════════╗${RESET}`
    );

    lines.push(
        `${BOLD}\x1b[36m║                             HUNTER WALLET                              ║${RESET}`
    );

    lines.push(
        `${BOLD}\x1b[36m╚════════════════════════════════════════════════════════════════════════╝${RESET}`
    );

	lines.push('');
    lines.push(`${BOLD}GLOBAL STATISTICS${RESET}`);
	lines.push(` Uptime    : ${formatTime(uptime)}`);
	lines.push(` Speed     : ${speed} tasks/sec`);
	lines.push(` Workers   : ${WORKERS}/64`);
    lines.push(` Success   : \x1b[32m${TOTAL_ON}${RESET}`);
    lines.push(` Failed    : \x1b[31m${TOTAL_FAIL}${RESET}`);
	lines.push(` Total     : ${TOTAL_TASKS}`);
    
	
    lines.push('');
    lines.push(`${BOLD}WORKER PROGRESS${RESET}`);
    lines.push('─'.repeat(74));


    for (const act of activities) {
        const workerPercent = Math.min(100, act.checked / BATCH_SIZE * 100);
		const nil = act.checked.toString();	
        lines.push(
            `${act.color}Worker ${String(act.id).padStart(2, '0')}${RESET} ` +
            `[${progressBar(workerPercent, act.color)}] ` +
            `${nil.padStart(6)} ` +
			`\x1b[31m${act.totfail.toString().padStart(9)}${RESET} \x1b[32m ${act.toton.toString().padStart(9)}${RESET} ${act.totall.toString().padStart(9)}` 
        );
    }

    lines.push('─'.repeat(74));
	
	lines.push('');
	lines.push(`${BOLD}FOUND ADDRESS : ${FOUND_IND}/${FOUND_ADDRS.length} ${RESET}`);
    lines.push('─'.repeat(74));
	
	if(FOUND_ADDRS.length > 0){

		const hsl = FOUND_ADDRS[FOUND_IND];

		lines.push(`Address : ${hsl.addr}`);
		lines.push(`Balance : ${hsl.bal}`);
		lines.push(`Key     : ${hsl.key}`);

	}	
		
    lines.push('');
    lines.push(`${DIM}Ctrl+C to stop workers${RESET}`);

    process.stdout.write(
        '\x1B[2J\x1B[3J\x1B[H' + lines.join('\n')
    );

}

function randomkey(bytes = 32){
	
	const gen = crypto.randomBytes(bytes);
	
	return gen.toString('hex');

}

const workers = [];


function generateBatch(){
  let batch = [];
  for (let i=0; i < BATCH_SIZE; i++){
		batch.push(randomkey(32));
	}
  return batch;
}


for (let i = 0; i < WORKERS; i++) {

  const worker = new Worker(
    new URL("./worker.js", import.meta.url),
    {
      workerData: {
        workerId: i,
		workerBatch : BATCH_SIZE
      }
    }
  );

  workers.push(worker);

  worker.on("message", async message => {
    if (message.type === "progress") {
		if(message.res.length > 0){
			for (const hsl of message.res) {
				FOUND_ADDRS.push(hsl);
			}
		}
		
		activities[message.workerId] = {
			id : activities[message.workerId].id,
			color : activities[message.workerId].color,
			checked : message.checked,
			fail: message.fail,
			toton: message.toton,			
			totfail: message.totfail,
			totall: message.totall,
			results: message.res
		};
		
		TOTAL_TASKS = 0;
		TOTAL_ON = 0;
		TOTAL_FAIL = 0;
		
		for (let n = 0; n < WORKERS; n++) {
			const act = activities[n];
			TOTAL_TASKS += act.totall;
			TOTAL_ON += act.toton;
			TOTAL_FAIL += act.totfail;
		}
		
		render();
    }

    if (message.type === "error") {
      console.error(
        `Worker ${message.workerId}:`,
        message.message
      );
    }

    if (message.type === "complete") {
		if(message.res.length > 0){
			for (const hsl of message.res) {
				FOUND_ADDRS.push(hsl);
			}
		}

		activities[message.workerId] = {
			id : activities[message.workerId].id,
			color : activities[message.workerId].color,
			checked : message.checked,
			fail: message.fail,
			toton: message.toton,			
			totfail: message.totfail,
			totall: message.totall,
			results: message.res
		};
		
		TOTAL_TASKS = 0;
		TOTAL_ON = 0;
		TOTAL_FAIL = 0;
		
		for (let n = 0; n < WORKERS; n++) {
			const act = activities[n];
			TOTAL_TASKS += act.totall;
			TOTAL_ON += act.toton;
			TOTAL_FAIL += act.totfail;
		}
		
		render();      
		sendNext(worker);
    }
  });

  worker.on("error", error => {
    console.error("Worker error:", error);
  });

  render();
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
