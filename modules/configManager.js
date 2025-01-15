// modules/configManager.js

const { Config, User, Origin, Destination } = require('../models');
const logger = require('./logger');

/**
 * Update group settings in memory or database
 * For simplicity, we'll use the database directly.
 */

/**
 * Get or create a Config object for a user
 * @param {number} userId - Telegram user ID
 * @returns {object} - Config instance
 */
const getOrCreateConfig = async (userId) => {
  let config = await Config.findOne({ where: { userId } });
  if (!config) {
    config = await Config.create({
      userId,
      originId: '',
      destinationId: '',
      adultCount: 1,
      departureDate: '',
      minAmount: 0
    });
  }
  return config;
};

/**
 * Update a specific field in the user's config
 * @param {number} userId - Telegram user ID
 * @param {string} field - Field name to update
 * @param {any} value - New value
 */
const updateGroupSetting = async (userId, field, value) => {
  try {
    const config = await getOrCreateConfig(userId);
    config[field] = value;
    await config.save();
  } catch (error) {
    logger.error(`Error updating config for user ${userId}: ${error.message}`);
  }
};

/**
 * Get user's config
 * @param {number} userId - Telegram user ID
 * @returns {object} - Config instance
 */
const getGroupConfig = async (userId) => {
  try {
    const config = await Config.findOne({ where: { userId } });
    return config;
  } catch (error) {
    logger.error(`Error fetching config for user ${userId}: ${error.message}`);
    return null;
  }
};

module.exports = {
  updateGroupSetting,
  getGroupConfig
};