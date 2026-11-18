require("@nomicfoundation/hardhat-toolbox");

// Load private key from env — NEVER commit this
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);
const BSCSCAN_KEY = process.env.BSCSCAN_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [PRIVATE_KEY],
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_KEY,
      bscTestnet: BSCSCAN_KEY,
    },
  },
};
