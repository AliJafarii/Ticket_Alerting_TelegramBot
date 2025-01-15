// models/User.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,  // small integer primary key
      primaryKey: true,
      autoIncrement: true
    },
    telegramId: {
      type: DataTypes.BIGINT,   // large field for Telegram ID
      unique: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneNumber: { // Collected via user sharing contact
      type: DataTypes.STRING,
      allowNull: true
    },
    languageCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_bot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
    // Add other fields as necessary
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};