import { Context, Markup } from "telegraf";
import { getUserByTelegramId } from "../../services/wallet";
import { getSwapQuote } from "../../services/saros";
import { setState, getState, clearState } from "../../utils/state";

export async function swapEntry(ctx: Context) {
  const telegramId = String(ctx.from?.id);
  const user = await getUserByTelegramId(telegramId);
  if (!user) return ctx.reply("No wallet found. Use /start.");

  setState(telegramId, { step: "AWAITING_INPUT_TOKEN" });
  await ctx.reply("Which token do you want to sell? (mint or symbol like SOL)");
}

export async function handleSwapStep(ctx: Context) {
  const telegramId = String(ctx.from?.id);
  const s = getState(telegramId);
  const text = (ctx.message as any)?.text?.trim();
  if (!s || !s.step || !text) return;

  if (s.step === "AWAITING_INPUT_TOKEN") {
    s.payload = { inputMint: text };
    s.step = "AWAITING_AMOUNT";
    setState(telegramId, s);
    return ctx.reply("How much do you want to sell? (e.g., 0.01)");
  }

  if (s.step === "AWAITING_AMOUNT") {
    const amount = Number(text);
    if (isNaN(amount) || amount <= 0) return ctx.reply("Enter a valid number.");
    s.payload.amount = amount;
    s.step = "AWAITING_OUTPUT_TOKEN";
    setState(telegramId, s);
    return ctx.reply("Which token do you want to buy? (mint or symbol)");
  }

  if (s.step === "AWAITING_OUTPUT_TOKEN") {
    s.payload.outputMint = text;
    await ctx.reply("Fetching quote...");

    try {
      const quote = await getSwapQuote(
        s.payload.inputMint,
        s.payload.outputMint,
        s.payload.amount
      );

      s.payload.quote = quote;
      s.step = "AWAITING_CONFIRM";
      setState(telegramId, s);

      await ctx.reply(
        `Quote:\n➡️ Sell: ${s.payload.amount} ${s.payload.inputMint}\n⬅️ Receive (est): ~${quote.outputAmount} ${s.payload.outputMint}\n📉 Price impact: ${quote.priceImpact}\n💸 Fees: ${quote.fees}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Confirm Swap", "SWAP_CONFIRM"),
            Markup.button.callback("❌ Cancel", "SWAP_CANCEL"),
          ],
        ])
      );
    } catch (e) {
      console.error("getSwapQuote error:", e);
      clearState(telegramId);
      return ctx.reply("Failed to fetch quote: " + (e as Error).message);
    }
  }
}
