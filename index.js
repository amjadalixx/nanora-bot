require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Web3 = require('web3');

// === CONFIG ===
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CHAT_ID = -1001725960763; // Nanora group ID
const TOKEN_DECIMALS = 18;
const TOKEN_PRICE = BigInt(process.env.TOKEN_PRICE); // Price in Wei

let lastCheckedBlock = 0;

// === KEEP BOT ALIVE WITH GROUP ACTIVITY ===
bot.on('message', (msg) => {
  if (msg.chat && msg.chat.id === CHAT_ID && msg.text) {
    console.log(`⏳ Keep-alive from ${msg.from.username || msg.from.first_name}`);
  }
});

// === MONITOR NEW BUYS TO CONTRACT ===
async function checkNewBuys() {
  try {
    const latestBlock = await web3.eth.getBlockNumber();

    if (!lastCheckedBlock) {
      lastCheckedBlock = latestBlock - 5;
    }

    for (let i = lastCheckedBlock + 1; i <= latestBlock; i++) {
      const block = await web3.eth.getBlock(i, true);
      if (!block || !block.transactions) continue;

      for (const tx of block.transactions) {
        if (tx.to && tx.to.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          const ethAmount = web3.utils.fromWei(tx.value, 'ether');

          const msg = `🚀 *New Buy:*\n👤 [${tx.from}](https://etherscan.io/address/${tx.from})\n💰 *${ethAmount} ETH* worth of $NANO`;

          await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
          console.log(`✅ Buy alert: ${ethAmount} ETH`);
        }
      }
    }

    lastCheckedBlock = latestBlock;
  } catch (err) {
    console.error('❌ Error checking buys:', err);
  }
}

// === TEST BUY TRIGGER ===
bot.onText(/\/testbuy/, (msg) => {
  const testMsg = `🚀 *New Buy:*\n👤 [0xTestUser](https://etherscan.io/address/0xTestUser)\n💰 *0.123 ETH* worth of $NANO`;
  bot.sendMessage(CHAT_ID, testMsg, { parse_mode: 'Markdown' });
  console.log(`🧪 Test buy triggered by ${msg.from.username || msg.from.first_name}`);
});

// === START LOOP ===
setInterval(checkNewBuys, 15000);

console.log('🟢 Nanora Buy Bot is live...');
