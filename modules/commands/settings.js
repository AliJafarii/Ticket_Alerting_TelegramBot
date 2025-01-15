// modules/commands/settings.js

const { getGroupConfig } = require('../configManager');
const { Origin, Destination } = require('../../models');
const { translate } = require('../i18n');
const { convertGregorianToJalaali } = require('jalaali-js');

/**
 * Displays the current configuration of the user.
 */
const settingsCommand = async (ctx) => {
  const userId = ctx.from.id;

  try {
    const config = await getGroupConfig(userId);

    if (config) {
      const origin = await Origin.findByPk(config.originId);
      const destination = await Destination.findByPk(config.destinationId);
      const gregorianDate = config.departureDate;

      const [gy, gm, gd] = gregorianDate.split('-').map(num => parseInt(num, 10));
      const jDate = convertGregorianToJalaali(gy, gm, gd);
      const jalaaliDate = `${jDate.jy}-${jDate.jm.toString().padStart(2, '0')}-${jDate.jd.toString().padStart(2, '0')}`;

      const currentSettingsMsg = translate('fa', 'current_settings', {
        origin: origin ? origin.name : 'نامشخص',
        destination: destination ? destination.name : 'نامشخص',
        adultCount: config.adultCount,
        departureDate: jalaaliDate,
        minAmount: config.minAmount.toLocaleString()
      });

      await ctx.reply(currentSettingsMsg, Markup.inlineKeyboard([
        [Markup.button.callback('بازگشت به منو اصلی', 'menu_main_menu')]
      ]));
    } else {
      await ctx.reply('هیچ تنظیمی انجام نشده است. از دکمه تنظیم هشدار استفاده کنید.', Markup.inlineKeyboard([
        [Markup.button.callback('بازگشت به منو اصلی', 'menu_main_menu')]
      ]));
    }
  } catch (error) {
    logger.error(`Error in settings command: ${error.message}`);
    await ctx.reply('خطایی رخ داده است. لطفاً بعداً تلاش کنید.');
  }
};

module.exports = settingsCommand;