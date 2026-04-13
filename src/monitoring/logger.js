/**
 * 结构化日志
 * 使用 pino 输出 JSON 日志，便于接入 ELK/Loki
 */

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
    service: 'easy-nodejs-bff',
  },
});

module.exports = logger;
