// modules/actions/adultCount.js

const { updateGroupSetting } = require('../configManager');
const { translate } = require('../i18n');
const { convertGregorianToJalaali } = require('jalaali-js');

/**
 * Handles adult count selection from the inline keyboard.
 * Automatically sets the departure date to the current date.
 */
const adultCountAction = async (ctx) => {
  const userId = ctx.from.id;
  const adultCount = parseInt(ctx.match[1], 10);
  const TIMEZONE = 'Asia/Tehran';

  if (adultCount >= 1 && adultCount <= 5) {
    try {
      await updateGroupSetting(userId, 'adultCount', adultCount);
      await ctx.reply(`تعداد نفرات تنظیم شد: ${adultCount}`);

      // Automatically set departure date to current date
      const currentDate = dayjs().tz(TIMEZONE).format('YYYY-MM-DD');
      await updateGroupSetting(userId, 'departureDate', currentDate);

      // Convert to Shamsi date for display
      const [gy, gm, gd] = currentDate.split('-').map(num => parseInt(num, 10));
      const jDate = convertGregorianToJalaali(gy, gm, gd);
      const jalaaliDate = `${jDate.jy}-${jDate.jm.toString().padStart(2, '0')}-${jDate.jd.toString().padStart(2, '0')}`;

      await ctx.reply(`تاریخ حرکت تنظیم شد: ${jalaaliDate}`);

      // Prompt user to input minimum amount
      await ctx.reply('لطفاً مبلغ حداقل مورد نظر را به ریال وارد کنید (مثال: 30000000):');
    } catch (error) {
      ctx.reply('خطایی رخ داده است. لطفاً دوباره تلاش کنید.');
    }
  } else {
    await ctx.reply('تعداد نفرات نامعتبر است. لطفاً دوباره تلاش کنید.');
  }

  await ctx.answerCbQuery();
};

module.exports = adultCountAction;