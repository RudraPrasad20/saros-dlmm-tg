import bot from './bot/index';
import 'dotenv/config';

const port = process.env.PORT || 3000;

(async () => {
  try {
    await bot.launch({
      allowedUpdates: ['message', 'callback_query']
  });        
    console.log('Bot started');
    // optional: simple keep-alive or express health endpoint (omitted for brevity)
  } catch (e) {
    console.error('Failed to start bot', e);
    process.exit(1);
  }

  // graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
})();
