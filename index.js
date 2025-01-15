require('dotenv').config(); // Load environment variables first

const { sequelize } = require('./models/index'); // Import Sequelize instance
const { startBot } = require('./modules/bot'); // Import the bot starter function
const logger = require('./modules/logger'); // Import logger

const initialize = async () => {
  try {
    // Wait for Sequelize to sync models
    await sequelize.sync();
    logger.info('Database synchronized successfully.');

    // Start the Telegram bot
    startBot();
  } catch (error) {
    logger.error('Initialization failed:', error);
    process.exit(1); // Exit the process with failure
  }
};

initialize();