// modules/actions/contact.js

const { updateGroupSetting } = require('../configManager');
const { User } = require('../../models');
const { translate } = require('../i18n');
const logger = require('../logger');

/**
 * Handles the contact information shared by the user.
 */
const contactHandler = async (ctx) => {
  const userId = ctx.from.id;
  const contact = ctx.message.contact;

  if (contact.user_id !== userId) {
    await ctx.reply('این شماره تلفن به شما تعلق ندارد.');
    return;
  }

  try {
    const user = await User.findOne({ where: { telegramId: userId } });
    if (user) {
      await user.update({ phoneNumber: contact.phone_number });
      await ctx.reply('شماره تلفن شما با موفقیت ثبت شد.', Markup.inlineKeyboard([
        [Markup.button.callback('بازگشت به منو اصلی', 'menu_main_menu')]
      ]));
    } else {
      await ctx.reply('کاربر یافت نشد. لطفاً /start را اجرا کنید.');
    }
  } catch (error) {
    logger.error(`Error updating phone number: ${error.message}`);
    await ctx.reply('خطایی رخ داده است. لطفاً بعداً تلاش کنید.');
  }
};

module.exports = contactHandler;