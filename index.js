require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Config
const WHALE_THRESHOLD_ETH = 2;
const BUY_GIF = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExczB3czhjY2t6NTBobzd0ZmJicmVzNDVyeXU5ZGYwcHZyeDJvYnRxbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXLpxypfSXvUc/giphy.gif";

console.log("DEBUG: BOT_TOKEN =", process.env.BOT_TOKEN);
console.log("DEBUG: CHAT_ID =", process.env.CHAT_ID);
console.log("DEBUG: RPC_URL =", process.env.RPC_URL);
console.log("DEBUG: CONTRACT_ADDRESS =", process.env.CONTRACT_ADDRESS);
console.log("DEBUG: TOKEN_PRICE =", process.env.TOKEN_PRICE);

// Ethers provider + contract
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  ["event TokensPurchased(address indexed buyer, uint256 amount)"],
  provider
);

// 🟢 Emoji generator for hype
function hypeEmojis(ethAmount) {
  const count = Math.floor(parseFloat(ethAmount) / 0.01);
  return "🟢".repeat(Math.min(count, 300));
}

// 🔔 Listen for actual buys
contract.on("TokensPurchased", async (buyer, amount) => {
  try {
    const ethValue = (parseFloat(amount.toString()) * parseFloat(process.env.TOKEN_PRICE)) / 1e18 / 2345;
    const ethFormatted = ethValue.toFixed(4);
    const isWhale = parseFloat(ethFormatted) >= WHALE_THRESHOLD_ETH;

    const baseMsg = isWhale
      ? `🔥 WHALE BUY ALERT 🔥\n👤 ${buyer}\n💰 ${ethFormatted} ETH worth of $NANO`
      : `🚀 New Buy:\n👤 ${buyer}\n💰 ${ethFormatted} ETH worth of $NANO`;

    const emojiHype = hypeEmojis(ethFormatted);
    const fullMsg = `${baseMsg}\n${emojiHype}`;

    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendAnimation`, {
      chat_id: process.env.CHAT_ID,
      animation: BUY_GIF,
      caption: fullMsg
    });

    console.log("✅ Buy alert sent!");
  } catch (err) {
    console.error("❌ Error sending buy alert:", err.message);
  }
});

// 🔍 Debug: log any raw event from contract
contract.on("*", (...args) => {
  console.log("📡 Raw contract event detected:", args);
});

// 🌐 Keep server alive (for Render)
app.get("/", (req, res) => {
  res.send("Nanora Buy Bot is live.");
});

app.listen(PORT, () => {
  console.log(`🌐 HTTP server running on port ${PORT}`);
});
