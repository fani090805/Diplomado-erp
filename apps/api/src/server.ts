import { config } from "./platform/config/index.js";
import { connectDatabase } from "./platform/db/mongoose.js";
import { logger } from "./platform/logger/index.js";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    const { app } = await import("./app.js");
    app.listen(config.port, () => {
      logger.info(`API listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, "Failed to start API");
    process.exit(1);
  }
};

startServer();
