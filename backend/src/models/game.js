import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

export const GAME_STATUSES = ['in-progress', 'won', 'abandoned'];

/**
 * Una partita. Lo stato è interamente salvato lato server, così il giocatore può riprenderla
 * da un altro dispositivo. `title` e `text` sono SEGRETI finché la partita non è conclusa:
 * il client riceve solo il testo oscurato (vedi services/gameEngine.js).
 */
export const Game = sequelize.define('Game', {
  pageId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
  // Parole già tentate (normalizzate: minuscole e senza accenti)
  guessedWords: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  wordAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  titleAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'in-progress' },
  startedAt: { type: DataTypes.DATE, allowNull: false },
  endedAt: { type: DataTypes.DATE, allowNull: true },
});
