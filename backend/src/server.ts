import { createApp } from "./app";
import { env } from "./config/env";
import { scheduleDailyJobs } from "./jobs/dailyJobs";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`GodownIQ backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  scheduleDailyJobs();
});
