require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Web3 = require('web3');

// === CONFIGURATION ===
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const web3 = new Web3(process.env.RPC_URL);

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS.toLowerCase();
const CHAT_ID = parseInt(process.env.CHAT_ID); // Group ID
const TOKEN_DECIMALS = 18;
const TOKEN_PRICE = BigInt(process.env.TOKEN_PRICE); // $0.00075 = 750000000000 wei (example)

let lastCheckedBlock = 0;

// === Keep Alive: Respond to ANY group message ===
bot.on('message', (msg) => {
  if (msg.chat && msg.chat.id === CHAT_ID && msg.text) {
    console.log(`💬 Keep-alive from group activity: ${msg.text.slice(0, 30)}...`);
  }
});
// === TEST BUY COMMAND ===
bot.onText(/\/testbuy/, async (msg) => {
  const testFrom = "0xTESTWALLET1234567890abcdef";
  const testAmount = "0.3";
  const nanoAmount = (parseFloat(testAmount) * 3700 / 0.00075).toFixed(2); // assuming $1 = 0.00075 NANO

  const testMessage = `🚀 *New Buy:*\n👤 [${testFrom}](https://etherscan.io/address/${testFrom})\n💰 *${testAmount} ETH* worth of $NANO\n🎯 Estimated: *$${(parseFloat(testAmount) * 3700).toFixed(2)} → ${nanoAmount} $NANO*`;

  await bot.sendMessage(CHAT_ID, testMessage, { parse_mode: 'Markdown' });
  console.log("✅ Test buy triggered.");
});
// === Monitor ETH Buys to the Presale Contract ===
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
        if (!tx.to) continue;

        if (tx.to.toLowerCase() === CONTRACT_ADDRESS && tx.value !== '0') {
          const ethAmount = web3.utils.fromWei(tx.value, 'ether');

          const sender = tx.from;
          const amountUSD = (parseFloat(ethAmount) * 3000).toFixed(2); // Example: 1 ETH = $3000
          const tokens = (parseFloat(amountUSD) / 0.00075).toLocaleString('en-US');

          const message = `🚀 *New Buy:*\n` +
            `👤 [${sender}](https://etherscan.io/address/${sender})\n` +
            `💰 *${ethAmount} ETH* worth of $NANO\n` +
            `🎯 Estimated: *$${amountUSD}* → *${tokens} $NANO*`;

          await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
          console.log(`✅ Buy Alert: ${ethAmount} ETH by ${sender}`);
        }
      }
    }

    lastCheckedBlock = latestBlock;
  } catch (err) {
    console.error('❌ Error in checkNewBuys():', err);
  }
}

// === Poll for Buys Every 15 Seconds ===
setInterval(checkNewBuys, 15000);

console.log('🟢 Nanora Buy Bot is LIVE...');
