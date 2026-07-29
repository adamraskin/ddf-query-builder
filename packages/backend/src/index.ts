import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`DDF query builder backend listening on http://localhost:${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`Expecting LM Studio at ${config.lmStudio.baseUrl} (model: ${config.lmStudio.model})`);
});
