// modules/configManager.js

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const GROUPS_CONFIG_PATH = path.join(__dirname, '..', 'config', 'groups.json');

const loadGroupConfigs = () => {
  try {
    if (!fs.existsSync(GROUPS_CONFIG_PATH)) {
      fs.writeFileSync(GROUPS_CONFIG_PATH, JSON.stringify({}));
    }
    const data = fs.readFileSync(GROUPS_CONFIG_PATH);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading group configurations: ${error.message}`);
    return {};
  }
};

const saveGroupConfigs = (configs) => {
  try {
    fs.writeFileSync(GROUPS_CONFIG_PATH, JSON.stringify(configs, null, 2));
    logger.info('Group configurations updated.');
  } catch (error) {
    logger.error(`Error saving group configurations: ${error.message}`);
  }
};

const updateGroupSetting = (groupId, key, value) => {
  const configs = loadGroupConfigs();
  if (!configs[groupId]) {
    configs[groupId] = {
      origin: '',
      destination: '',
      adultCount: 1,
      departureDate: '',
      minAmount: 0
    };
  }
  configs[groupId][key] = value;
  saveGroupConfigs(configs);
};

const getGroupConfig = (groupId) => {
  const configs = loadGroupConfigs();
  return configs[groupId] || null;
};

module.exports = {
  loadGroupConfigs,
  saveGroupConfigs,
  updateGroupSetting,
  getGroupConfig
};