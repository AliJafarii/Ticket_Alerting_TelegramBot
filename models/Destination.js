// models/Destination.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Destination = sequelize.define('Destination', {
    code: {
      type: DataTypes.STRING(3),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'destinations',
    timestamps: false
  });

  return Destination;
};