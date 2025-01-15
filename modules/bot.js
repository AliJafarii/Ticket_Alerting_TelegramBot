// modules/bot.js

const { Telegraf, Markup } = require('telegraf');
const logger = require('./logger'); // Ensure logger is correctly referenced
const { translate } = require('./i18n');
const { User, Origin, Destination, Config } = require('../models');
const setupCommand = require('./commands/setup');
const settingsCommand = require('./commands/settings');
const helpCommand = require('./commands/help');
const originAction = require('./actions/origin');
const destinationAction = require('./actions/destination');
const adultCountAction = require('./actions/adultCount');
const minAmountAction = require('./actions/minAmount');
const shareContactCommand = require('./commands/shareContact');
const contactHandler = require('./actions/contact');
const { updateGroupSetting, getGroupConfig } = require('./configManager');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Initialize dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set timezone to Tehran
const TIMEZONE = 'Asia/Tehran';

// Initialize Telegraf with BOT_TOKEN from environment variables
const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware to log all incoming updates
bot.use((ctx, next) => {
  logger.info(`Received update: ${JSON.stringify(ctx.update)}`);
  return next();
});

// Handle /start command
bot.start(async (ctx) => {
  const userData = {
    telegramId: ctx.from.id,
    username: ctx.from.username || null,
    firstName: ctx.from.first_name || null,
    lastName: ctx.from.last_name || null,
    phoneNumber: null,
    languageCode: ctx.from.language_code || 'fa',
    is_bot: ctx.from.is_bot
  };

  try {
    // Find or create the user
    const [user, created] = await User.findOrCreate({
      where: { telegramId: userData.telegramId },
      telegramId: ctx.from.id
    });

    if (!created) {
      // Update user information if it has changed
      await user.update(userData);
    }

    const welcomeMessage = translate('fa', 'welcome');
    await ctx.reply(welcomeMessage, createMainMenu());
  } catch (error) {
    logger.error(`Error creating/updating user: ${error.message}`);
    await ctx.reply('خطایی رخ داده است. لطفاً بعداً تلاش کنید.');
  }
});

// Handle /menu command
bot.command('menu', async (ctx) => {
  await ctx.reply('لطفاً یک گزینه را انتخاب کنید:', createMainMenu());
});

// Handle /share_contact command
bot.command('share_contact', async (ctx) => {
  await shareContactCommand(ctx);
});

// Handle contact sharing
bot.on('contact', async (ctx) => {
  await contactHandler(ctx);
});

// Handle Main Menu actions
bot.action(/menu_(.+)/, async (ctx) => {
  const action = ctx.match[1];
  const userId = ctx.from.id;

  switch(action) {
    case 'setup':
      await setupCommand(ctx, createSelectionKeyboard);
      break;

    case 'settings':
      await settingsCommand(ctx);
      break;

    case 'help':
      await helpCommand(ctx);
      break;

    case 'main_menu':
      await ctx.reply('لطفاً یک گزینه را انتخاب کنید:', createMainMenu());
      break;

    default:
      await ctx.reply(translate('fa', 'error_invalid_option'), createMainMenu());
  }

  await ctx.answerCbQuery();
});

// Handle origin selection
bot.action(/origin_(\w{3})/, async (ctx) => {
  await originAction(ctx, createSelectionKeyboard);
});

// Handle destination selection
bot.action(/destination_(\w{3})/, async (ctx) => {
  await destinationAction(ctx, createSelectionKeyboard);
});

// Handle adult count selection
bot.action(/adultCount_(\d+)/, async (ctx) => {
  await adultCountAction(ctx);
});

// Handle min amount input
bot.on('text', async (ctx) => {
  await minAmountAction(ctx);
});

// Function to create main menu
const createMainMenu = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('تنظیم هشدار', 'menu_setup')],
    [Markup.button.callback('مشاهده تنظیمات', 'menu_settings')],
    [Markup.button.callback('راهنما', 'menu_help')]
  ]);
};

// Function to create selection keyboard
const createSelectionKeyboard = (items, callbackPrefix) => {
  const buttons = Object.keys(items).map(name =>
    Markup.button.callback(name, `${callbackPrefix}_${items[name]}`)
  );

  // Arrange buttons in rows of 2
  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }

  return Markup.inlineKeyboard(keyboard);
};

// Handle unexpected callback queries
bot.on('callback_query', async (ctx) => {
  if (!ctx.match) {
    await ctx.reply('گزینه نامعتبر است.', createMainMenu());
    await ctx.answerCbQuery();
  }
});

// Function to start the bot
const startBot = () => {
  bot.launch()
    .then(() => logger.info('Telegram bot started successfully.'))
    .catch((error) => logger.error(`Failed to launch bot: ${error.message}`));

  // Enable graceful stop
  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    logger.info('Bot stopped gracefully.');
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    logger.info('Bot stopped gracefully.');
  });
};

module.exports = {
  startBot
};