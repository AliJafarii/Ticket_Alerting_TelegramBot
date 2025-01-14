// modules/scheduler.js

const cron = require('node-cron');
const logger = require('./logger');
const { loadGroupConfigs } = require('./configManager');
const { fetchFlightData } = require('./api');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { Telegraf } = require('telegraf');

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
bot.launch(); // Ensure bot is running

// Function to process and send alerts
const processAlerts = async () => {
  const configs = loadGroupConfigs();
  const now = dayjs().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
  logger.info(`Starting scheduled task at ${now}`);

  for (const groupId in configs) {
    const config = configs[groupId];
    const { origin, destination, adultCount, departureDate, minAmount } = config;

    // Validate required fields
    if (!origin || !destination || !departureDate || !minAmount) {
      logger.warn(`Group ${groupId}: Incomplete settings. Skipping.`);
      continue;
    }

    try {
      const apiParams = {
        origin,
        destination,
        adultCount,
        departureDate
      };

      const data = await fetchFlightData(apiParams);
      const airfares = data.airfares;

      if (!airfares || airfares.length === 0) {
        logger.info(`Group ${groupId}: No airfares found.`);
        continue;
      }

      // Collect all fares where per person price <= minAmount
      const matchingFares = airfares.filter(fare => {
        const pricingDetails = fare.pricing.pricingDetails;
        const adultDetail = pricingDetails.find(detail => detail.passengerType === 'ADULT');
        if (adultDetail) {
          const perPersonPrice = adultDetail.payablePrice;
          return perPersonPrice <= minAmount;
        }
        return false;
      });

      if (matchingFares.length === 0) {
        logger.info(`Group ${groupId}: No fares below minAmount (${minAmount} IRR per person).`);
        continue;
      }

      // Prepare the message with all matching fares
      let message = `📢 **Low Price Alert** 📢\n\n`;

      matchingFares.forEach((fare, index) => {
        const pricingDetails = fare.pricing.pricingDetails;
        const adultDetail = pricingDetails.find(detail => detail.passengerType === 'ADULT');
        const perPersonPrice = adultDetail.payablePrice;

        // Assuming the first segment contains the required details
        const segment = fare.routes[0].segments[0];
        const departureDateTimeGregorian = dayjs(segment.departureDateTime).tz(TIMEZONE);
        const departureDateFormatted = departureDateTimeGregorian.format('YYYY-MM-DD');
        const departureTime = departureDateTimeGregorian.format('HH:mm');

        const flightNumber = segment.flightNumber;
        const seatsRemaining = segment.seatsRemaining;
        const airlineName = fare.airlineName || 'Unknown';

        message += `**Ticket ${index + 1}:**\n`;
        message += `💺 **Price:** ${perPersonPrice.toLocaleString()} IRR\n`;
        message += `🕒 **Date:** ${departureDateFormatted}\n`;
        message += `🕒 **Time:** ${departureTime}\n`;
        message += `✈️ **Flight Number:** ${flightNumber}\n`;
        message += `🔢 **Seats Remaining:** ${seatsRemaining}\n`;
        message += `🛫 **Airline:** ${airlineName}\n\n`;
      });

      // Send the message to the group
      await bot.telegram.sendMessage(groupId, message, { parse_mode: 'Markdown' });
      logger.info(`Group ${groupId}: Sent price alert for ${matchingFares.length} ticket(s).`);

    } catch (error) {
      logger.error(`Group ${groupId}: Error processing alert - ${error.message}`);
    }
  }
};

// Schedule the task to run every minute
const startScheduler = () => {
  cron.schedule('* * * * *', () => {
    processAlerts();
  });
  logger.info('Scheduler started: API will be called every minute.');
};

module.exports = {
  startScheduler
};