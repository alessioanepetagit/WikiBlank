import { sequelize } from '../db.js';
import { User } from './user.js';
import { Game } from './game.js';

User.hasMany(Game, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
Game.belongsTo(User, { as: 'player', foreignKey: { name: 'userId', allowNull: false } });

export { sequelize, User, Game };
