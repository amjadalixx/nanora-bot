require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Web3 = require('web3');

// === CONFIG ===
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const web3 = new Web3(process.env.RPC_URL); // ✅ FIXED
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CHAT_ID = -1001725960763; // Nanora group ID
const TOKEN_DECIMALS = 18;
const TOKEN_PRICE = BigInt(process.env.TOKEN_PRICE); // in Wei
let lastCheckedBlock = 0;

// === KEEP BOT ALIVE WITH GROUP ACTIVITY ===
bot.on('message', (msg) => {
  if (msg.chat && msg.chat.id === CHAT_ID && msg.text) {
    console.log(`⏳ Keep-alive from ${msg.from.username || msg.from.first_name}`);
  }
});

// === /testbuy command ===
bot.onText(/\/testbuy/, async (msg) => {
  const testFrom = "0xTESTWALLET1234567890abcdef";
  const testAmount = "0.003";
  const nanoAmount = (parseFloat(testAmount) * 3700 / 0.00075).toFixed(2);

  const testMessage = `🚀 *New Buy:*\n👤 [${testFrom}](https://etherscan.io/address/${testFrom})\n💰 *${testAmount} ETH* worth of $NANO\n🎯 Estimated: *$${(parseFloat(testAmount) * 3700).toFixed(2)} → ${nanoAmount} $NANO*`;

  await bot.sendMessage(CHAT_ID, testMessage, { parse_mode: 'Markdown' });
  console.log("✅ Test buy triggered.");
});

// === MONITOR NEW BUYS ===
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
          const usdValue = (parseFloat(ethAmount) * 3700).toFixed(2);
          const nanoAmount = (parseFloat(usdValue) / 0.00075).toFixed(2);

          const msg = `🚀 *New Buy:*\n👤 [${tx.from}](https://etherscan.io/address/${tx.from})\n💰 *${ethAmount} ETH* worth of $NANO\n🎯 Estimated: *$${usdValue} → ${nanoAmount} $NANO*`;

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

// === START MONITORING ===
setInterval(checkNewBuys, 15000);
console.log('🟢 Nanora Buy Bot is LIVE...');
