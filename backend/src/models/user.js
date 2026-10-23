import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

export const User = sequelize.define('User', {
  username: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
});
