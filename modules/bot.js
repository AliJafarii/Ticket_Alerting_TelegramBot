// modules/bot.js

const { Telegraf, Markup } = require('telegraf');
const logger = require('./logger');
const {
  updateGroupSetting,
  getGroupConfig
} = require('./configManager');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Initialize dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set timezone to Tehran
const TIMEZONE = 'Asia/Tehran';

// Set locale to Persian (optional)
dayjs.locale('fa');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN is not defined in the .env file.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Load origins and destinations
const originsPath = path.join(__dirname, '..', 'config', 'origins.json');
const destinationsPath = path.join(__dirname, '..', 'config', 'destinations.json');

const originsData = JSON.parse(fs.readFileSync(originsPath, 'utf-8'));
const destinationsData = JSON.parse(fs.readFileSync(destinationsPath, 'utf-8'));

// Map to track group states
const groupStates = new Map();

// Helper to create inline keyboards for origins and destinations
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

// Helper to create inline keyboards for selecting year, month, day
const createYearKeyboard = (years) => {
  const buttons = years.map(year =>
    Markup.button.callback(year, `select_year_${year}`)
  );
  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 3) { // 3 per row
    keyboard.push(buttons.slice(i, i + 3));
  }
  return Markup.inlineKeyboard(keyboard);
};

const createMonthKeyboard = () => {
  const months = [
    'January', 'February', 'March',
    'April', 'May', 'June',
    'July', 'August', 'September',
    'October', 'November', 'December'
  ];

  const buttons = months.map((month, index) =>
    Markup.button.callback(month, `select_month_${index + 1}`) // 1-based
  );

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 4) { // 4 per row
    keyboard.push(buttons.slice(i, i + 4));
  }

  return Markup.inlineKeyboard(keyboard);
};

const createDayKeyboard = (month, year) => {
  // Ensure month is two digits
  const formattedMonth = month.toString().padStart(2, '0');
  const daysInMonth = dayjs(`${year}-${formattedMonth}-01`).daysInMonth();

  const buttons = [];
  for (let day = 1; day <= daysInMonth; day++) {
    buttons.push(Markup.button.callback(day.toString(), `select_day_${day}`));
  }

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 7) { // 7 per row
    keyboard.push(buttons.slice(i, i + 7));
  }

  return Markup.inlineKeyboard(keyboard);
};

// Start command
bot.start((ctx) => {
  ctx.reply('Hello! Use /setup to configure flight price alerts.');
});

// Setup command to initiate configuration
bot.command('setup', async (ctx) => {
  const groupId = ctx.chat.id;
  // Reset existing settings
  updateGroupSetting(groupId, 'origin', '');
  updateGroupSetting(groupId, 'destination', '');
  updateGroupSetting(groupId, 'adultCount', 1);
  updateGroupSetting(groupId, 'departureDate', '');
  updateGroupSetting(groupId, 'minAmount', 0);

  // Reset group state
  groupStates.set(groupId, 'select_origin');

  await ctx.reply('Please select the origin:', 
    createSelectionKeyboard(originsData, 'origin')
  );
});

// Handler for origin selection
bot.action(/origin_(\w{3})/, async (ctx) => {
  const groupId = ctx.chat.id;
  const originCode = ctx.match[1];
  const originName = Object.keys(originsData).find(key => originsData[key] === originCode);

  updateGroupSetting(groupId, 'origin', originCode);
  await ctx.reply(`Origin set to: ${originName}`);

  // Proceed to select destination
  groupStates.set(groupId, 'select_destination');
  await ctx.reply('Please select the destination:', 
    createSelectionKeyboard(destinationsData, 'destination')
  );

  await ctx.answerCbQuery();
});

// Handler for destination selection
bot.action(/destination_(\w{3})/, async (ctx) => {
  const groupId = ctx.chat.id;
  const destinationCode = ctx.match[1];
  const destinationName = Object.keys(destinationsData).find(key => destinationsData[key] === destinationCode);

  updateGroupSetting(groupId, 'destination', destinationCode);
  await ctx.reply(`Destination set to: ${destinationName}`);

  // Proceed to select adult count
  groupStates.set(groupId, 'select_adultCount');

  const adultCounts = {};
  for (let i = 1; i <= 5; i++) { // Allowing up to 5 adults
    adultCounts[i] = i;
  }

  await ctx.reply('Please select the number of adults:', 
    createSelectionKeyboard(adultCounts, 'adultCount')
  );

  await ctx.answerCbQuery();
});

// Handler for adult count selection
bot.action(/adultCount_(\d+)/, async (ctx) => {
  const groupId = ctx.chat.id;
  const adultCount = parseInt(ctx.match[1], 10);

  updateGroupSetting(groupId, 'adultCount', adultCount);
  await ctx.reply(`Number of adults set to: ${adultCount}`);

  // Proceed to select departure date
  groupStates.set(groupId, 'select_departure_year');

  // Define a range of years (current and next year)
  const currentYear = dayjs().year();
  const years = [currentYear, currentYear + 1];

  await ctx.reply('Please select the departure year:', 
    createYearKeyboard(years)
  );

  await ctx.answerCbQuery();
});

// Handler for selecting year
bot.action(/select_year_(\d+)/, async (ctx) => {
  const groupId = ctx.chat.id;
  const selectedYear = ctx.match[1];

  const config = getGroupConfig(groupId);
  if (config) {
    // Temporarily store selected year in config
    updateGroupSetting(groupId, 'selectedYear', selectedYear);
  }

  await ctx.reply(`Departure year set to: ${selectedYear}`);

  // Proceed to select month
  groupStates.set(groupId, 'select_departure_month');
  await ctx.reply('Please select the departure month:', 
    createMonthKeyboard()
  );

  await ctx.answerCbQuery();
});

// Handler for selecting month
bot.action(/select_month_(\d+)/, async (ctx) => {
  const groupId = ctx.chat.id;
  const selectedMonth = ctx.match[1];

  const config = getGroupConfig(groupId);
  if (config && config.selectedYear) {
    // Ensure month is two digits
    const formattedMonth = selectedMonth.toString().padStart(2, '0');
    updateGroupSetting(groupId, 'selectedMonth', formattedMonth);
  }

  const monthName = dayjs().month(selectedMonth -1).format('MMMM'); // 0-based

  await ctx.reply(`Departure month set to: ${monthName}`);

  // Proceed to select day
  groupStates.set(groupId, 'select_departure_day');

  const selectedYear = config.selectedYear;
  const selectedGregorianMonth = dayjs(`${selectedYear}-${selectedMonth}-01`).format('MM'); // ensure two digits
  await ctx.reply('Please select the departure day:', 
    createDayKeyboard(selectedGregorianMonth, selectedYear)
  );

  await ctx.answerCbQuery();
});

// Handler for selecting day
bot.action(/select_day_(\d+)/, async (ctx) => {
  const groupId = ctx.chat.id;
  let selectedDay = ctx.match[1];

  // Pad day with leading zero if necessary
  selectedDay = selectedDay.toString().padStart(2, '0');

  const config = getGroupConfig(groupId);
  if (config && config.selectedYear && config.selectedMonth) {
    updateGroupSetting(groupId, 'selectedDay', selectedDay);
  }

  await ctx.reply(`Departure day set to: ${selectedDay}`);

  // Now, compile the selected date
  const selectedYear = config.selectedYear;
  const selectedMonth = config.selectedMonth;
  const selectedDayFinal = config.selectedDay;

  const gregorianDate = dayjs(`${selectedYear}-${selectedMonth}-${selectedDayFinal}`).format('YYYY-MM-DD');

  updateGroupSetting(groupId, 'departureDate', gregorianDate);
  await ctx.reply(`Departure date set to: ${gregorianDate}`);

  // Proceed to input minAmount
  groupStates.set(groupId, 'input_minAmount');
  await ctx.reply('Please enter the minimum amount in IRR (e.g., 30000000):');

  await ctx.answerCbQuery();
});

// Handler for minAmount input
bot.on('text', async (ctx) => {
  const groupId = ctx.chat.id;
  const message = ctx.message.text.trim();

  const config = getGroupConfig(groupId);

  if (config && config.departureDate && config.selectedYear && config.selectedMonth && config.selectedDay && !config.minAmount) {
    const minAmount = parseInt(message, 10);
    if (isNaN(minAmount) || minAmount <= 0) {
      await ctx.reply('Invalid amount. Please enter a positive number.');
      return;
    }

    updateGroupSetting(groupId, 'minAmount', minAmount);
    await ctx.reply(`Minimum amount set to: ${minAmount.toLocaleString()} IRR`);

    // Confirmation
    const originName = Object.keys(originsData).find(key => originsData[key] === config.origin);
    const destinationName = Object.keys(destinationsData).find(key => destinationsData[key] === config.destination);
    const departureDateFormatted = dayjs(config.departureDate, 'YYYY-MM-DD').format('YYYY-MM-DD');

    await ctx.reply(`⚙️ **Your settings have been saved as follows:**\n` +
                  `1. Origin: ${originName}\n` +
                  `2. Destination: ${destinationName}\n` +
                  `3. Number of Adults: ${config.adultCount}\n` +
                  `4. Departure Date: ${departureDateFormatted}\n` +
                  `5. Minimum Amount: ${config.minAmount.toLocaleString()} IRR`);

    // Reset group state
    groupStates.delete(groupId);
  }
});

// Settings command to view current configurations
bot.command('settings', (ctx) => {
  const groupId = ctx.chat.id;
  const config = getGroupConfig(groupId);
  if (config) {
    const originName = Object.keys(originsData).find(key => originsData[key] === config.origin) || 'Unknown';
    const destinationName = Object.keys(destinationsData).find(key => destinationsData[key] === config.destination) || 'Unknown';
    const departureDateFormatted = dayjs(config.departureDate, 'YYYY-MM-DD').format('YYYY-MM-DD');

    ctx.reply(`⚙️ **Current Settings:**\n` +
              `1. Origin: ${originName}\n` +
              `2. Destination: ${destinationName}\n` +
              `3. Number of Adults: ${config.adultCount}\n` +
              `4. Departure Date: ${departureDateFormatted}\n` +
              `5. Minimum Amount: ${config.minAmount.toLocaleString()} IRR`);
  } else {
    ctx.reply('No settings have been configured yet. Use /setup to start.');
  }
});

// Help command
bot.help((ctx) => {
  ctx.reply('Available commands:\n' +
            '/setup - Configure flight price alerts\n' +
            '/settings - View current settings');
});

// Launch the bot
const startBot = () => {
  bot.launch()
    .then(() => logger.info('Telegram bot started successfully.'))
    .catch((error) => logger.error(`Failed to launch bot: ${error.message}`));
};

// Enable graceful stop
const gracefulStop = () => {
  bot.stop('SIGINT');
  logger.info('Bot stopped gracefully.');
};

process.once('SIGINT', gracefulStop);
process.once('SIGTERM', gracefulStop);

module.exports = {
  startBot
};