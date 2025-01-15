// modules/logger.js

const { createLogger, format, transports } = require('winston');
const path = require('path');

// Define the log format
const logFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

// Create the logger
const logger = createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new transports.File({ filename: path.join(__dirname, '..', 'bot.log') }),
    new transports.Console()
  ]
});

module.exports = logger;