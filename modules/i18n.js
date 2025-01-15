// modules/i18n.js

const fs = require('fs');
const path = require('path');

const locales = {};

// Load all locale files
const loadLocales = () => {
  const localesPath = path.join(__dirname, '..', 'locales');
  const files = fs.readdirSync(localesPath);

  files.forEach(file => {
    if (file.endsWith('.json')) {
      const locale = file.split('.')[0];
      const data = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf-8'));
      locales[locale] = data;
    }
  });
};

loadLocales();

/**
 * Translate function to fetch the correct string.
 * @param {string} locale - The locale code, e.g., 'fa'.
 * @param {string} key - The key in the JSON file.
 * @param {object} variables - An object containing variables to replace in the string.
 * @returns {string} - The translated string.
 */
const translate = (locale, key, variables = {}) => {
  let text = locales[locale][key] || key;

  // Replace variables in the string
  Object.keys(variables).forEach(variable => {
    const regex = new RegExp(`{{${variable}}}`, 'g');
    text = text.replace(regex, variables[variable]);
  });

  return text;
};

module.exports = {
  translate
};