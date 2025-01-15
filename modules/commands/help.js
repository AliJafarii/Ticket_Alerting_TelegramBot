// modules/commands/help.js

const { translate } = require('../i18n');

/**
 * Provides help information to the user.
 */
const helpCommand = async (ctx) => {
  const helpText = translate('fa', 'help_text');
  await ctx.reply(helpText, Markup.inlineKeyboard([
    [Markup.button.callback('بازگشت به منو اصلی', 'menu_main_menu')]
  ]));
};

module.exports = helpCommand;