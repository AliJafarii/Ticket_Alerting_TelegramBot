// models/Origin.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Origin = sequelize.define('Origin', {
    code: {
      type: DataTypes.STRING(3),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'origins',
    timestamps: false
  });

  return Origin;
};