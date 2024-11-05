const winston = require('winston')

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
})

/**
 * Для логирования, используйте функции:
 * `logger.debug()`
 * `logger.info()`
 * `logger.warn()`
 * `logger.error()`
 *
 * Можно отправлять как просто строки, например `logger.info('Информационное сообщение')`,
 * так и структурированные объекты с параметром message,
 * например `logger.debug({message: "Дебаг запроса", event: event})`
 * В последнем случае, в логах будет отображаться сообщение "Дебаг запроса", а информация
 * из объекта event буде доступна в раскрывающейся информации об этой записи.
 */

module.exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    body: 'Hello World!',
  }
}
