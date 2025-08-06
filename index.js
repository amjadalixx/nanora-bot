require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const WHALE_THRESHOLD_ETH = 2;
const BUY_GIF = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExczB3czhjY2t6NTBobzd0ZmJicmVzNDVyeXU5ZGYwcHZyeDJvYnRxbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXLpxypfSXvUc/giphy.gif";

const ETH_TO_USD = parseFloat(process.env.ETH_PRICE || "3700"); // e.g., 3700
const NANO_PRICE_USD = 0.00075; // 1 NANO = $0.00075

console.log("DEBUG: BOT_TOKEN =", process.env.BOT_TOKEN);
console.log("DEBUG: CHAT_ID =", process.env.CHAT_ID);
console.log("DEBUG: RPC_URL =", process.env.RPC_URL);
console.log("DEBUG: CONTRACT_ADDRESS =", process.env.CONTRACT_ADDRESS);
console.log("DEBUG: ETH_TO_USD =", ETH_TO_USD);

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  ["event TokensPurchased(address indexed buyer, uint256 ethAmount)"],
  provider
);

function hypeEmojis(ethAmount) {
  const count = Math.floor(parseFloat(ethAmount) / 0.01);
  return "🟢".repeat(Math.min(count, 300));
}

function calcNano(ethAmount) {
  const usd = ethAmount * ETH_TO_USD;
  return usd / NANO_PRICE_USD;
}

// --- Buy Handler as Reusable Function ---
async function handleBuy(buyer, ethAmountRaw) {
  try {
    // ethAmountRaw is in WEI
    const ethAmount = parseFloat(ethers.utils.formatEther(ethAmountRaw));
    const isWhale = ethAmount >= WHALE_THRESHOLD_ETH;

    // Calculate USD & NANO
    const usdValue = ethAmount * ETH_TO_USD;
    const nanoAmount = usdValue / NANO_PRICE_USD;

    const baseMsg = isWhale
      ? `🔥 WHALE BUY ALERT 🔥\n👤 ${buyer}\n💰 ${ethAmount} ETH ($${usdValue.toFixed(2)})\n🪙 = ${nanoAmount.toLocaleString()} NANO`
      : `🚀 New Buy:\n👤 ${buyer}\n💰 ${ethAmount} ETH ($${usdValue.toFixed(2)})\n🪙 = ${nanoAmount.toLocaleString()} NANO`;

    const emojiHype = hypeEmojis(ethAmount);
    const fullMsg = `${baseMsg}\n${emojiHype}`;

    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendAnimation`, {
      chat_id: process.env.CHAT_ID,
      animation: BUY_GIF,
      caption: fullMsg
    });

    console.log("✅ Buy alert sent!", buyer, ethAmount, nanoAmount);
  } catch (err) {
    console.error("❌ Error sending buy alert:", err.message);
  }
}

// Listen to real events
contract.on("TokensPurchased", handleBuy);

// --- Test Buy Simulation Block ---
if (process.env.TEST_BUY === "1") {
  setTimeout(() => {
    const testBuyer = "0xTEST000000000000000000000000000000000001";
    const testAmount = ethers.utils.parseEther("1"); // 1 ETH
    handleBuy(testBuyer, testAmount);
  }, 2000); // Triggers after 2 seconds
}

app.get("/", (req, res) => {
  res.send("🟢 Nanora Buy Bot is running");
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});
