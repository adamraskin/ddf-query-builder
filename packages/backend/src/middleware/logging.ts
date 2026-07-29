import morgan from 'morgan';
import { config } from '../config';

export function loggingMiddleware() {
  return morgan(config.logLevel);
}
