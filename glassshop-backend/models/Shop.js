const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shop = sequelize.define('Shop', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    shopName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'shop_name'
    },
    ownerName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'owner_name'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    whatsappNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'whatsapp_number'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'shop',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return Shop;
};
