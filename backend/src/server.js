import { createApp } from './app.js';
import { config } from './config.js';
import { sequelize } from './models/index.js';

await sequelize.sync();

createApp().listen(config.port, () => {
  console.log(`WikiBlank API in ascolto su http://localhost:${config.port} (sorgente articoli: ${config.wiki.source})`);
});
