// models/Config.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Config = sequelize.define('Config', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER, // references user.id (small integer)
      allowNull: false
    },
    originId: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    destinationId: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    adultCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    departureDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    minAmount: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
    // Add other fields as necessary
  }, {
    tableName: 'configs',
    timestamps: true
  });

  return Config;
};