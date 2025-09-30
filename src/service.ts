import { Connection, PublicKey } from '@solana/web3.js';
import { sarosDLMM } from './services/provider';

// A placeholder for a pool address we want to query.
// In a real application, you would fetch this dynamically or have a list of popular pools.
const MOCKED_POOL_ADDRESS = '89n4k4Fqs9sS2hFr12j8p8tB5GN2i2M4bffXh5Ypr8aO'; // Example: SOL/USDC Pool

export class SarosService {
    private connection: Connection;
    private sdk: typeof sarosDLMM;

    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.sdk = sarosDLMM;
    }

    /**
     * Fetches all DLMM positions for a given wallet address.
     * @param walletAddress The public key of the user's wallet.
     * @returns A formatted string summarizing the user's positions.
     */
    public async getPortfolio(walletAddress: string): Promise<string> {
        console.log(`Fetching portfolio for ${walletAddress}...`);
        try {
            const userPublicKey = new PublicKey(walletAddress);

            // Fetch all DLMM pool addresses. In a real app, you might cache this.
            const allPoolAddresses = await this.sdk.fetchPoolAddresses();
            if (!allPoolAddresses || allPoolAddresses.length === 0) {
                return "Could not fetch Saros pools. Please try again later.";
            }
            
            // Aggregate all positions owned by the user across pools
            const positionsByPool: { address: string; positions: any[] }[] = [];
            for (const addr of allPoolAddresses) {
                try {
                    const pairPk = new PublicKey(addr);
                    const positions = await this.sdk.getUserPositions({ payer: userPublicKey, pair: pairPk });
                    if (positions && positions.length > 0) {
                        positionsByPool.push({ address: addr, positions });
                    }
                } catch (_) {
                    // skip invalid/failed pool fetches
                }
            }

            if (positionsByPool.length === 0) {
                return `No Saros DLMM positions found for wallet: \`${walletAddress}\``;
            }

            // Format the output for Telegram
            let response = `*Saros DLMM Portfolio for ${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}*\n\n`;
            const totalPositions = positionsByPool.reduce((acc, p) => acc + p.positions.length, 0);
            response += `Found *${totalPositions}* positions across *${positionsByPool.length}* pools:\n`;
            response += `------------------------------------\n`;

            for (const { address, positions } of positionsByPool) {
                // Try to enrich with metadata (best-effort)
                let title = `Pool ${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
                try {
                    const md = await this.sdk.fetchPoolMetadata(address);
                    const base = md.baseMint.substring(0, 4) + '...' + md.baseMint.substring(md.baseMint.length - 4);
                    const quote = md.quoteMint.substring(0, 4) + '...' + md.quoteMint.substring(md.quoteMint.length - 4);
                    title = `${base}/${quote}`;
                } catch (_) {}

                response += `*Pool*: ${title}\n`;
                for (const position of positions) {
                    response += `*Position*: \`${position.position}\`\n`;
                }
                response += `------------------------------------\n`;
            }
            return response;

        } catch (error) {
            console.error("Error fetching portfolio:", error);
            if (error instanceof Error && error.message.includes('Invalid public key')) {
                 return "❌ Error: The wallet address you provided is invalid. Please check it and try again.";
            }
            return "❌ An error occurred while fetching your portfolio. Please try again later.";
        }
    }
}
