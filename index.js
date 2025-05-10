require("dotenv").config();

const { ethers } = require("ethers");
const axios = require("axios");
const express = require("express");
const app = express();

// 🌐 HTTP keep-alive server for Render
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("🟢 NANO Bot is live."));
app.listen(PORT, () => console.log(`🌐 HTTP server running on port ${PORT}`));

// ✅ Debug log environment variables
console.log("DEBUG: BOT_TOKEN =", process.env.BOT_TOKEN);
console.log("DEBUG: CHAT_ID =", process.env.CHAT_ID);
console.log("DEBUG: RPC_URL =", process.env.RPC_URL);
console.log("DEBUG: CONTRACT_ADDRESS =", process.env.CONTRACT_ADDRESS);
console.log("DEBUG: TOKEN_PRICE =", process.env.TOKEN_PRICE);

// Constants
const WHALE_THRESHOLD_ETH = 2;
const BUY_GIF = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExczB3czhjY2t6NTBobzd0ZmJicmVzNDVyeXU5ZGYwcHZyeDJvYnRxbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXLpxypfSXvUc/giphy.gif";
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, [
  "event TokensPurchased(address indexed buyer, uint256 amount)"
], provider);
const tokenPrice = ethers.BigNumber.from(process.env.TOKEN_PRICE);

// Function to generate 🟢 emojis
function hypeEmojis(ethAmount) {
  const count = Math.floor(parseFloat(ethAmount) / 0.01);
  return "🟢".repeat(Math.min(count, 100)); // Telegram safe
}

// 🎯 Event listener for real buys
contract.on("TokensPurchased", async (buyer, amount) => {
  try {
    const tokens = ethers.BigNumber.from(amount);
    const ethSpent = tokens.mul(tokenPrice).div(ethers.constants.WeiPerEther);
    const ethFormatted = ethers.utils.formatEther(ethSpent);
    const isWhale = parseFloat(ethFormatted) >= WHALE_THRESHOLD_ETH;

    const baseMsg = isWhale
      ? `🔥 WHALE BUY ALERT 🔥\n👤 ${buyer}\n💰 ${ethFormatted} ETH worth of $NANO`
      : `🚀 New Buy:\n👤 ${buyer}\n💰 ${ethFormatted} ETH worth of $NANO`;

    const fullMsg = `${baseMsg}\n${hypeEmojis(ethFormatted)}`;

    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendAnimation`, {
      chat_id: process.env.CHAT_ID,
      animation: BUY_GIF,
      caption: fullMsg
    });

    console.log(isWhale ? "✅ WHALE alert sent!" : "✅ Buy alert sent!");
  } catch (error) {
    console.error("❌ Error processing buy event:", error.message);
  }
});

// 🔁 Optional: Self-ping to prevent idle on some platforms
setInterval(() => {
  axios.get(`https://${process.env.RENDER_EXTERNAL_URL || "your-render-app-url.onrender.com"}`)
    .then(() => console.log("🔄 Self-ping successful"))
    .catch(err => console.error("❌ Self-ping failed:", err.message));
}, 10 * 60 * 1000); // every 10 minutes

// 🛡️ Crash handlers
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

console.log("🟢 Bot is LIVE and watching for real presale buys...");
