# AgentTip.ai ⚡

**Tip anyone by their Agent ID on BNB Chain.**

Send BNB to any `name.ai` holder — no wallet address needed. Just type their Agent ID name, resolve it, and tip.

Built for the [Binance Agent ID Hackathon](https://www.binance.com/en/support/announcement).

## How It Works

1. **Connect** your wallet (MetaMask / Binance Wallet)
2. **Enter** the recipient's Agent ID (e.g. `cuong.ai`)
3. **Resolve** — the app looks up the wallet address via SPACE ID
4. **Tip** — BNB goes directly to the recipient, 0% fee

Both sender and receiver must hold a Binance Agent ID (ERC-721, non-transferable).

## Agent ID Integration

AgentTip deeply integrates with the Agent ID system:

- **Identity verification**: Both parties must hold an Agent ID to participate
- **Name resolution**: Uses SPACE ID API to resolve `name.ai` → wallet address
- **On-chain validation**: Smart contract checks Agent ID ownership via `balanceOf()`
- **Community building**: Encourages Agent ID adoption through social tipping

## Tech Stack

- **Smart Contract**: Solidity 0.8.20 on BNB Chain (BSC)
- **Frontend**: Vanilla HTML/CSS/JS + ethers.js v6
- **Name Resolution**: SPACE ID REST API
- **Agent ID Contract**: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`

## Project Structure

```
agenttip/
├── contracts/
│   └── AgentTip.sol          # Core tipping contract
├── frontend/
│   ├── index.html            # Main page
│   ├── style.css             # Dark crypto theme
│   └── app.js                # Wallet + contract logic
├── scripts/
│   └── deploy.js             # Deployment script
├── hardhat.config.js         # Hardhat configuration
├── package.json
└── README.md
```

## Setup & Deploy

### Prerequisites
- Node.js 18+
- BNB on BSC for gas
- A claimed Agent ID (`name.ai`)

### Install
```bash
npm install
```

### Compile
```bash
npx hardhat compile
```

### Deploy to BSC
```bash
export PRIVATE_KEY="your_private_key_here"
npx hardhat run scripts/deploy.js --network bsc
```

### Verify on BscScan
```bash
export BSCSCAN_KEY="your_bscscan_api_key"
npx hardhat verify --network bsc 0xaAFffe2b1126A74708AC4C4382e86832b8E00D4A 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
```

### Deployed Contract
- **BSC Mainnet**: [`0xaAFffe2b1126A74708AC4C4382e86832b8E00D4A`](https://bscscan.com/address/0xaAFffe2b1126A74708AC4C4382e86832b8E00D4A)
- Verified on [Sourcify](https://repo.sourcify.dev/56/0xaAFffe2b1126A74708AC4C4382e86832b8E00D4A/)

### Frontend
Deploy `frontend/` to Vercel or any static host.

## Smart Contract

The contract is intentionally simple and transparent:

- **No protocol fee** — 100% of the tip goes to the receiver
- **No admin/owner** — no one can drain funds or change rules
- **On-chain messages** — tips can carry a short message, stored permanently
- **Full history** — all tips are queryable by sender or receiver
- **Stats** — total tips, volume, unique tippers/receivers tracked on-chain

## Security

- No proxy pattern — what you see is what you get
- No `selfdestruct`, no upgradability
- Reentrancy safe — state updated before external call
- Open source — verify on BscScan

## License

MIT
