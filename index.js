require('dotenv').config();
const Web3 = require('web3');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
const CHAT_ID = process.env.CHAT_ID;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS.toLowerCase();
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS) || 18;

let lastBlock = 0;

// Stay alive by reacting to group messages
bot.on('message', (msg) => {
  if (msg.chat && msg.chat.id == CHAT_ID) {
    console.log("👀 Group is active, staying alive...");
  }
});

// Manual /testbuy command
bot.onText(/\/testbuy (\d+(\.\d+)?)/, async (msg, match) => {
  const ethAmount = match[1];
  const fromAddress = "0xFAKEBUY1234567890ABCDEF"; // Simulated address

  const message = `🚀 *New Buy (Test)*\n👤 [${fromAddress}](https://etherscan.io/address/${fromAddress})\n💰 *${ethAmount} ETH* worth of $NANO`;

  await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
  console.log(`✅ Sent test buy: ${ethAmount} ETH`);
});

async function monitorBuys() {
  const currentBlock = await web3.eth.getBlockNumber();

  if (lastBlock === 0) {
    lastBlock = currentBlock - 1;
  }

  const events = await web3.eth.getPastLogs({
    fromBlock: lastBlock + 1,
    toBlock: currentBlock,
    address: CONTRACT_ADDRESS,
    topics: []
  });

  for (const event of events) {
    const tx = await web3.eth.getTransaction(event.transactionHash);
    if (!tx || !tx.to) continue;

    if (tx.to.toLowerCase() === CONTRACT_ADDRESS) {
      const ethAmount = web3.utils.fromWei(tx.value, 'ether');
      const usdPrice = await getEthPrice();
      const usdAmount = (parseFloat(ethAmount) * usdPrice).toFixed(2);

      const message = `🚀 *New Buy*\n👤 [${tx.from}](https://etherscan.io/address/${tx.from})\n💰 *${ethAmount} ETH* (~$${usdAmount}) worth of $NANO`;

      await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      console.log(`✅ Detected buy: ${ethAmount} ETH from ${tx.from}`);
    }
  }

  lastBlock = currentBlock;
}

async function getEthPrice() {
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    return res.data.ethereum.usd;
  } catch (err) {
    console.error("❌ Failed to fetch ETH price", err);
    return 0;
  }
}

setInterval(monitorBuys, 8000);

console.log("🟢 Nanora Buy Bot is LIVE...");
