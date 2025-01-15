// modules/actions/destination.js

const { updateGroupSetting } = require('../configManager');
const { translate } = require('../i18n');

/**
 * Handles destination selection from the inline keyboard.
 */
const destinationAction = async (ctx, createSelectionKeyboard) => {
  const userId = ctx.from.id;
  const destinationCode = ctx.match[1];

  try {
    await updateGroupSetting(userId, 'destinationId', destinationCode);
    await ctx.reply(`مقصد تنظیم شد: ${ctx.match[0].split('_')[1]}`);

    // Prompt user to select number of adults
    const adultCounts = {};
    for (let i = 1; i <= 5; i++) { // Allowing up to 5 adults
      adultCounts[i] = i;
    }

    const prompt = translate('fa', 'setup_prompt_adult_count');
    await ctx.reply(prompt, createSelectionKeyboard(adultCounts, 'adultCount'));
  } catch (error) {
    ctx.reply('خطایی رخ داده است. لطفاً دوباره تلاش کنید.');
  }

  await ctx.answerCbQuery();
};

module.exports = destinationAction;