// modules/logger.js

const winston = require('winston');
const moment = require('moment-timezone');

// Define custom format to include Tehran time
const customFormat = winston.format.printf(({ level, message }) => {
  const timestamp = moment().tz('Asia/Tehran').format('YYYY-MM-DD HH:mm:ss');
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    customFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ],
});

module.exports = logger;