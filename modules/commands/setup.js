// modules/commands/setup.js

const { updateGroupSetting, getGroupConfig } = require('../configManager');
const { Origin, Destination } = require('../../models');
const { translate } = require('../i18n');
const logger = require('../logger');

/**
 * Initiates the setup process by resetting previous configurations
 * and prompting the user to select the origin.
 */
const setupCommand = async (ctx, createSelectionKeyboard) => {
  const userId = ctx.from.id;

  try {
    // Reset existing settings
    await updateGroupSetting(userId, 'originId', '');
    await updateGroupSetting(userId, 'destinationId', '');
    await updateGroupSetting(userId, 'adultCount', 1);
    await updateGroupSetting(userId, 'departureDate', '');
    await updateGroupSetting(userId, 'minAmount', 0);

    // Prompt user to select origin
    const origins = await Origin.findAll();
    const originsData = {};
    origins.forEach(origin => {
      originsData[origin.name] = origin.code;
    });

    const prompt = translate('fa', 'setup_prompt_origin');
    await ctx.reply(prompt, createSelectionKeyboard(originsData, 'origin'));
  } catch (error) {
    logger.error(`Error in setup command: ${error.message}`);
    await ctx.reply('خطایی رخ داده است. لطفاً بعداً تلاش کنید.');
  }
};

module.exports = setupCommand;