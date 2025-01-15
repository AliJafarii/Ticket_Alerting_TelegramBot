// testConnection.js

require('dotenv').config();
const { sequelize } = require('./models');

const test = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

test();