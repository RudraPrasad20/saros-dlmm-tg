import "dotenv/config";
import { Markup, session, Telegraf } from "telegraf";
import { getState } from "../utils/state";
import {
  startHandler,
  walletCommand,
  WAITING_FOR_POOL,
} from "./handler/walletHandler";
import { swapEntry, handleSwapStep } from "./handler/swap";
import { PublicKey } from "@solana/web3.js";
import { sarosDLMM } from "../services/provider";
import { message } from "telegraf/filters";
import { createPoolInteractive } from "../pool/createPool";
import { TOKENS } from "../utils/tokens";
import { MyContext, MySessionData } from "../utils/types/context";

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN || "");

bot.use(
  session({
    defaultSession: (): MySessionData => ({
      tokenBase: undefined,
      tokenQuote: undefined,
    }),
  })
);

bot.start(startHandler);
bot.command("wallet", walletCommand);
bot.command("swap", swapEntry);

// pools
bot.action("create_pool", async (ctx) => {
  ctx.reply(
    "Pick your base token:",
    Markup.inlineKeyboard(
      Object.values(TOKENS).map((t) => [
        Markup.button.callback(t.symbol, `base_${t.id}`),
      ])
    )
  );
});

bot.action(/base_(.+)/, async (ctx) => {
  ctx.session.tokenBase = ctx.match[1];
  ctx.reply(
    "Pick your quote token:",
    Markup.inlineKeyboard(
      Object.values(TOKENS).map((t) => [
        Markup.button.callback(t.symbol, `quote_${t.id}`),
      ])
    )
  );
});

bot.action(/quote_(.+)/, async (ctx) => {
  ctx.session.tokenQuote = ctx.match[1];
  const { tokenBase, tokenQuote } = ctx.session;

  if (!tokenBase) {
    return ctx.reply("You must select a base token first.");
  }

  try {
    const { pair, pairAddress } = await createPoolInteractive(
      tokenBase,
      tokenQuote
    );

    ctx.reply(
      `✅ Pool created!\nBase: ${tokenBase}\nQuote: ${tokenQuote}\nPair Address: ${pairAddress}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("💰 View wallet", "WALLET_VIEW"),
          Markup.button.callback("🔑 Export Secret", "WALLET_EXPORT"),
        ],
        [Markup.button.callback("📚 Pools", "GET_ALL_POOLS")],
        [Markup.button.callback("🔍 Pool Details", "GET_POOL_DETAILS")],
        [Markup.button.callback("➕ Create New Pool", "create_pool")],
      ])
    );
  } catch (err) {
    ctx.reply(`❌ Failed to create pool`);
  }
});

bot.on(message("text"), async (ctx) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const s = getState(telegramId);
  if (s?.step?.startsWith("AWAITING_")) {
    return handleSwapStep(ctx);
  }

  if (!WAITING_FOR_POOL.has(telegramId)) return;

  const input = (ctx.message as any)?.text?.trim() || "";
  WAITING_FOR_POOL.delete(telegramId);

  try {
    let poolAddress: string | undefined =
      input && input.length > 0 ? input : undefined;

    if (!poolAddress) {
      const poolAddresses = await sarosDLMM.fetchPoolAddresses();
      if (!poolAddresses || poolAddresses.length === 0) {
        return ctx.reply("No pools found on devnet.");
      }

      poolAddress = poolAddresses[0];

      let reply = `Found ${poolAddresses.length} pools. Showing top 5 pools:\n\n`;
      poolAddresses.slice(0, 5).forEach((address, idx) => {
        reply += `${idx + 1}. ${address}\n`;
      });

      reply += `\nShowing details for first pool: ${poolAddress}\n\n`;
      await ctx.reply(
        reply,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("💰 View wallet", "WALLET_VIEW"),
            Markup.button.callback("🔑 Export Secret", "WALLET_EXPORT"),
          ],
          [Markup.button.callback("📚 Pools", "GET_ALL_POOLS")],
          [Markup.button.callback("🔍 Pool Details", "GET_POOL_DETAILS")],
          [Markup.button.callback("➕ Create New Pool", "create_pool")],
        ])
      );
    }

    const poolPubKey = new PublicKey(poolAddress);
    const metadata = await sarosDLMM.fetchPoolMetadata(poolPubKey.toBase58());

    let metadataMsg = `📊 Pool Details for ${poolAddress}:\n\n`;
    metadataMsg += `🟢 Base Token: ${metadata.baseMint}\n`;
    metadataMsg += `🔵 Quote Token: ${metadata.quoteMint}\n`;
    metadataMsg += `💰 Base Reserve: ${metadata.baseReserve}\n`;
    metadataMsg += `💸 Quote Reserve: ${metadata.quoteReserve}\n`;
    metadataMsg += `🔢 Base Decimal: ${metadata.extra.tokenBaseDecimal}\n`;
    metadataMsg += `🔢 Quote Decimal: ${metadata.extra.tokenQuoteDecimal}\n`;
    metadataMsg += `⚡ Trade Fee: ${metadata.tradeFee}%\n`;

    await ctx.reply(
      metadataMsg,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("💰 View wallet", "WALLET_VIEW"),
          Markup.button.callback("🔑 Export Secret", "WALLET_EXPORT"),
        ],
        [Markup.button.callback("📚 Pools", "GET_ALL_POOLS")],
        [Markup.button.callback("🔍 Pool Details", "GET_POOL_DETAILS")],
        [Markup.button.callback("➕ Create New Pool", "create_pool")],
      ])
    );
  } catch (err) {
    console.error("fetchPoolMetadata failed:", err);
    return ctx.reply(`❌ Invalid Id or error: ${(err as Error).message}`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("💰 View wallet", "WALLET_VIEW"),
          Markup.button.callback("🔑 Export Secret", "WALLET_EXPORT"),
        ],
        [Markup.button.callback("📚 Pools", "GET_ALL_POOLS")],
        [Markup.button.callback("🔍 Pool Details", "GET_POOL_DETAILS")],
        [Markup.button.callback("➕ Create New Pool", "create_pool")],
      ]),
    });
  }
});

export default bot;
