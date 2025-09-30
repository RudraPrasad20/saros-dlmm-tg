import { Context, Markup } from 'telegraf';
import { getUserByTelegramId } from '../../services/wallet';
import { setState } from '../../utils/state';
import { sarosDLMM } from '../../services/provider';

const WAITING_FOR_POOL: Set<string> = new Set();

export async function startHandler(ctx: Context) {
  const telegramId = String(ctx.from?.id);
  const existing = await getUserByTelegramId(telegramId);
  if (existing) {
    return ctx.reply(`You already have a wallet: ${existing.publicKey}`,         
      Markup.inlineKeyboard([
      [Markup.button.callback('💰 View wallet', 'WALLET_VIEW'), Markup.button.callback('🔑 Export Secret', 'WALLET_EXPORT')],
      [Markup.button.callback('📚 Pools', 'GET_ALL_POOLS')],
      [Markup.button.callback('🔍 Pool Details', 'GET_POOL_DETAILS')],
      [Markup.button.callback("➕ Create New Pool", "create_pool")],
    ]));
    
    
  }
  setState(telegramId, { step: 'AWAITING_PASSWORD_CREATE' });
  await ctx.reply('Enter a password to create a wallet.');
}

export async function walletCommand(ctx: Context) {
  const telegramId = String(ctx.from?.id);
  const user = await getUserByTelegramId(telegramId);
  if (!user) return ctx.reply('No wallet found. Use /start.');
  return ctx.reply(`Public Key: ${user.publicKey}`);
}

export async function getAllPoolsHandler(ctx: Context) {
  const poolAddresses = await sarosDLMM.fetchPoolAddresses();
  const topPools = poolAddresses.slice(0, 5);
  let reply = `Found ${poolAddresses.length} pools. Top 5:\n`;
  topPools.forEach((p, i) => reply += `${i + 1}. ${p}\n`);
  await ctx.reply(reply);
}

export async function getPoolDetailsHandler(ctx: Context) {
  const userId = ctx.from?.id?.toString();
  if (!userId) return ctx.reply("Can't detect user ID");
  WAITING_FOR_POOL.add(userId);
  await ctx.reply('Send the pool address you want details for.');
}

export { WAITING_FOR_POOL };
