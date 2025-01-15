'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Example: Changing the column in the Config table
    await queryInterface.changeColumn('Configs', 'userId', {
      type: Sequelize.BIGINT,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Optionally revert to INTEGER if needed
    await queryInterface.changeColumn('Configs', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};