// modules/commands/shareContact.js

const { updateGroupSetting } = require('../configManager');
const { User } = require('../../models');
const { translate } = require('../i18n');
const logger = require('../logger');

/**
 * Initiates contact sharing.
 */
const shareContactCommand = async (ctx) => {
  await ctx.reply('لطفاً شماره تلفن خود را با استفاده از دکمه زیر به اشتراک بگذارید:', 
    Markup.keyboard([
      Markup.button.contactRequest('اشتراک‌گذاری شماره تلفن')
    ]).oneTime().resize()
  );
};

module.exports = shareContactCommand;