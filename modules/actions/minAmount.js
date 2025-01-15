// modules/actions/minAmount.js

const { updateGroupSetting, getGroupConfig } = require('../configManager');
const { Config, User, Origin, Destination } = require('../../models');
const { translate } = require('../i18n');
const { convertGregorianToJalaali } = require('jalaali-js');
const logger = require('../logger');

/**
 * Handles the input of minimum amount.
 */
const minAmountAction = async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text.trim();

  const minAmount = parseInt(message, 10);
  if (isNaN(minAmount) || minAmount <= 0) {
    await ctx.reply('مبلغ نامعتبر است. لطفاً یک عدد مثبت وارد کنید.');
    return;
  }

  try {
    await updateGroupSetting(userId, 'minAmount', minAmount);
    await ctx.reply(`مبلغ حداقل تنظیم شد: ${minAmount.toLocaleString()} IRR`);

    // Fetch user and config
    const user = await User.findOne({ where: { telegramId: userId } });
    const config = await getGroupConfig(userId);

    if (!user) {
      await ctx.reply('کاربر یافت نشد. لطفاً /start را اجرا کنید.');
      return;
    }

    // Create Config entry
    await Config.create({
      userId: user.id,
      originId: config.originId,
      destinationId: config.destinationId,
      adultCount: config.adultCount,
      departureDate: config.departureDate,
      minAmount: minAmount
    });

    // Fetch origin and destination names
    const origin = await Origin.findByPk(config.originId);
    const destination = await Destination.findByPk(config.destinationId);

    // Convert departure date to Shamsi
    const [gy, gm, gd] = config.departureDate.split('-').map(num => parseInt(num, 10));
    const jDate = convertGregorianToJalaali(gy, gm, gd);
    const jalaaliDate = `${jDate.jy}-${jDate.jm.toString().padStart(2, '0')}-${jDate.jd.toString().padStart(2, '0')}`;

    const confirmationMsg = translate('fa', 'confirmation', {
      origin: origin ? origin.name : 'نامشخص',
      destination: destination ? destination.name : 'نامشخص',
      adultCount: config.adultCount,
      departureDate: jalaaliDate,
      minAmount: minAmount.toLocaleString()
    });

    await ctx.reply(confirmationMsg, Markup.inlineKeyboard([
      [Markup.button.callback('بازگشت به منو اصلی', 'menu_main_menu')]
    ]));

  } catch (error) {
    logger.error(`Error saving config: ${error.message}`);
    await ctx.reply('خطایی در ذخیره تنظیمات رخ داده است. لطفاً بعداً تلاش کنید.');
  }
};

module.exports = minAmountAction;