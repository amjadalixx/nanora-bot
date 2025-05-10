require("dotenv").config();

const { ethers } = require("ethers");
const axios = require("axios");
const express = require("express");
const app = express();

// 🌐 Keep-alive HTTP server
app.get("/", (req, res) => res.send("Bot is live and watching Ethereum buys..."));
app.listen(3000, () => console.log("🌐 HTTP server running on port 3000"));

// Debug logs
console.log("DEBUG: BOT_TOKEN =", process.env.BOT_TOKEN);
console.log("DEBUG: CHAT_ID =", process.env.CHAT_ID);
console.log("DEBUG: RPC_URL =", process.env.RPC_URL);
console.log("DEBUG: CONTRACT_ADDRESS =", process.env.CONTRACT_ADDRESS);
console.log("DEBUG: TOKEN_PRICE =", process.env.TOKEN_PRICE);

// Constants
const WHALE_THRESHOLD_ETH = 2; // ETH threshold for whale alerts
const BUY_GIF = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExczB3czhjY2t6NTBobzd0ZmJicmVzNDVyeXU5ZGYwcHZyeDJvYnRxbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXLpxypfSXvUc/giphy.gif";

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
  "event TokensPurchased(address indexed buyer, uint256 amount)"
], provider);

const tokenPrice = ethers.BigNumber.from(process.env.TOKEN_PRICE); // in wei

// Generate 🟢 emojis based on ETH spent
function hypeEmojis(ethAmount) {
  const count = Math.floor(parseFloat(ethAmount) / 0.01);
  return "🟢".repeat(Math.min(count, 300)); // avoid Telegram limits
}

// Event listener for TokensPurchased
contract.on("TokensPurchased", async (buyer, amount) => {
  try {
    const tokens = ethers.BigNumber.from(amount); // tokens in 18 decimals

    // Calculate ETH spent: (tokens * tokenPrice) / 1e18
    const ethSpent = tokens.mul(tokenPrice).div(ethers.constants.WeiPerEther);
    const ethFormatted = ethers.utils.formatEther(ethSpent);

    const isWhale = parseFloat(ethFormatted) >= WHALE_THRESHOLD_ETH;

    const baseMsg = isWhale
      ? `🔥 WHALE BUY ALERT 🔥\n👤 ${buyer}\n💰 ${ethFormatted} ETH worth of $NANO`
      : `🚀 New Buy:\n👤 ${buyer}\n💰 ${ethFormatted} ETH worth of $NANO`;

    const emojis = hypeEmojis(ethFormatted);
    const fullMsg = `${baseMsg}\n${emojis}`;

    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendAnimation`, {
      chat_id: process.env.CHAT_ID,
      animation: BUY_GIF,
      caption: fullMsg
    });

    console.log(isWhale ? "✅ WHALE alert sent!" : "✅ Buy alert sent!");
  } catch (error) {
    console.error("❌ Error in buy event:", error.message);
  }
});

console.log("🟢 Bot is LIVE and watching for real presale buys...");
