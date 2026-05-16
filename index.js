// index.js

require('dotenv').config();
const logger = require('./modules/logger');
const botModule = require('./modules/bot');
const schedulerModule = require('./modules/scheduler');

const bot = botModule.startBot();
if (bot) {
  schedulerModule.startScheduler(bot);
} else {
  logger.warn('Scheduler not started because BOT_TOKEN is missing.');
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
