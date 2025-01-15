// models/index.js

const { Sequelize } = require('sequelize');
const logger = require('../modules/logger'); // Ensure logger is correctly referenced

// Initialize Sequelize with DATABASE_URL from .env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Disable logging; enable if needed
});

// Test the database connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    logger.error('Unable to connect to the database:', err);
  });

// Import models
const User = require('./User')(sequelize);
const Origin = require('./Origin')(sequelize);
const Destination = require('./Destination')(sequelize);
const Config = require('./Config')(sequelize);

// Define associations
Config.belongsTo(User, { foreignKey: 'userId' });
Config.belongsTo(Origin, { foreignKey: 'originId' });
Config.belongsTo(Destination, { foreignKey: 'destinationId' });
User.hasMany(Config, { foreignKey: 'userId' });
Origin.hasMany(Config, { foreignKey: 'originId' });
Destination.hasMany(Config, { foreignKey: 'destinationId' });

// Sync models with the database, allowing alterations
sequelize.sync({ alter: true })
  .then(() => {
    console.log('All models were synchronized successfully.');
  })
  .catch(err => {
    logger.error('Error syncing models:', err);
  });

module.exports = {
  sequelize,
  User,
  Origin,
  Destination,
  Config
};