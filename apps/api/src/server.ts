import { app } from './app.js';
import { config } from './core/config/index.js';
import { connectDatabase } from './core/db/mongoose.js';
import { logger } from './core/logger/index.js';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    app.listen(config.port, () => {
      logger.info(`API listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start API');
    process.exit(1);
  }
};

startServer();
