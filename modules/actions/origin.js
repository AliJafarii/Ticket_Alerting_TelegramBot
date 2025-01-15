// modules/actions/origin.js

const { updateGroupSetting } = require('../configManager');
const { Destination } = require('../../models');
const { translate } = require('../i18n');

/**
 * Handles origin selection from the inline keyboard.
 */
const originAction = async (ctx, createSelectionKeyboard) => {
  const userId = ctx.from.id;
  const originCode = ctx.match[1];

  try {
    await updateGroupSetting(userId, 'originId', originCode);
    await ctx.reply(`مبدا تنظیم شد: ${ctx.match[0].split('_')[1]}`);

    // Prompt user to select destination
    const destinations = await Destination.findAll();
    const destinationsData = {};
    destinations.forEach(destination => {
      destinationsData[destination.name] = destination.code;
    });

    const prompt = translate('fa', 'setup_prompt_destination');
    await ctx.reply(prompt, createSelectionKeyboard(destinationsData, 'destination'));
  } catch (error) {
    ctx.reply('خطایی رخ داده است. لطفاً دوباره تلاش کنید.');
  }

  await ctx.answerCbQuery();
};

module.exports = originAction;