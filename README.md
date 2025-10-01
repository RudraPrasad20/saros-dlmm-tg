# Solana DLMM Telegram Bot
A Telegram bot to interact with the Solana DLMM (Dynamic Liquidity Market Maker) SDK. Users can create wallets, manage liquidity pools, perform swaps, and view their positions directly from Telegram. Wallets are securely stored in a pg db.

### Demo:


https://github.com/user-attachments/assets/796133f9-db9a-444e-851a-637140ae20c6



## Features
- User Wallet Management
- Generate Solana wallets per Telegram user
- Wallets encrypted and stored in pg
- View wallet public key and export secret key
- Liquidity Pools
- Create new pools with base and quote tokens
- List all available pools on Devnet
- Fetch detailed pool metadata
- Swap Flow
- Perform token swaps interactively
- Step-by-step user flow via Telegram messages
- Positions
- View user positions in specific pools
- Fetch and display active liquidity positions
- Secure
- Wallet secrets encrypted with AES-256-GCM
- Simplified encryption using a server-side fixed key
### Tech Stack
- Node.js + TypeScript
- Telegraf for Telegram bot
- Prisma ORM + SQLite/PostgreSQL for storage
- Solana Web3.js
- @saros-finance/dlmm-sdk
### Setup Instructions
1. Clone the repository
~~~
git clone <repo-url>
~~~
~~~
cd <repo-folder>
~~~
2. Install dependencies
~~~
npm install
~~~
3. Configure environment variables
Create a .env file at the project root:
~~~
TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
SOLANA_RPC_URL=https://api.devnet.solana.com
DATABASE_URL="file:./dev.db" # or your PostgreSQL URL
TELEGRAM_BOT_TOKEN: Bot token from BotFather
SOLANA_RPC_URL: Solana RPC endpoint (Devnet or Mainnet)
DATABASE_URL: Prisma database connection string
~~~
4. Initialize the database
~~~
npx prisma migrate dev --name init
~~~
This will create the necessary tables for users, pools, and tokens.
5. Start the bot
~~~
npm run dev
~~~
Bot will start and listen for Telegram updates.
### Usage
- Start the bot: /start
- Creates user session
- Create wallet: /wallet
- Generates a new Solana wallet (encrypted in DB)
- Swap tokens: /swap
- Interactive flow for swapping tokens
- Create liquidity pool:
- Click “➕ Create New Pool”
- Select base and quote tokens
- View pools:
- Click “📚 Pools” to see all available pools
- Click “🔍 Pool Details” to see metadata
- View positions:
- Click “📊 Positions” to fetch your current positions in a pool

### Notes
- This bot currently works on Solana Devnet. 
- For Mainnet, update SOLANA_RPC_URL.
- Wallet secrets are encrypted with a fixed server-side key, so no passwords are required.
- Tokens are predefined in TOKENS; you can add more tokens as needed.
