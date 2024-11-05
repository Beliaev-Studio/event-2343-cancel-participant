const winston = require('winston')

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
})

const token = process.env.TOKEN
const event_id = process.env.EVENT_ID

const api = require('axios').create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
})

module.exports.handler = async function (event, context) {
  const referer = event.headers['Referer'] || ''
  const origin = event.headers['Origin'] || ''
  const sandboxHeader = event.headers['X-Sandbox'] || 0
  const isSandbox = referer.includes(':8000') || origin.includes(':8000') || sandboxHeader

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, PATCH',
      }
    }
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'GET, PATCH',
        'Access-Control-Allow-Headers': '*'
      }
    }
  }

  if (!('code' in event.queryStringParameters) || !event.queryStringParameters.code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ errors: [{ message: 'Неправильная ссылка' }] })
    }
  }

  const code = event.queryStringParameters.code

  if (event.httpMethod === 'GET') {
    try {
      let participant = await getParticipant(code, isSandbox)

      if (!participant || !participant.id || !participant.code) {
        logger.error({ message: 'Не найден ID пользователя' })

        throw {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': '*'
          },
          body: JSON.stringify({ errors: 'Не найден ID пользователя' })
        }
      }

      let checkSlots = !!participant?.консультация_время

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: participant.code, slot: checkSlots})
      }
    } catch (e) {
      return {
        statusCode: e.statusCode || 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': '*'
        },
        body: e.body || JSON.stringify({ errors: [{ message: 'Ответ от сервера не был успешным' }] })
      }
    }
  }

  if (event.httpMethod === 'PATCH') {
    try {
      let participant = await getParticipant(code, isSandbox)

      if (!participant || !participant.id) {
        logger.error({ message: 'Не найден ID пользователя' })

        throw {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': '*'
          },
          body: JSON.stringify({ errors: 'Не найден ID пользователя' })
        }
      }

      try {
        const participantData = {
          'name': 'DELETE',
          'surname': '',
          'patronymic': '',
          'email': '',
          'phone': '',
          'company': '',
          'консультация_дата': '',
          'консультация_время': '',
          'консультация_номер_стола': '',
          'город_для_открытия_Яндекс_Лавка': '',
          'согласие_на_рассылку': '',
          'groupId': 7331
        }

        const status = await updateParticipantData(participant.id, participantData, isSandbox)

        if(status !== 200) {
          logger.error({ message: 'Ошибка отмены консультации' })

          return {
            statusCode: 500,
            body: JSON.stringify({ errors: 'Ошибка отмены консультации' })
          }
        }

      } catch (error) {
        return error
      }

      return {
        statusCode: 200
      }
    } catch (e) {
      return {
        statusCode: e.statusCode || 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': '*'
        },
        body: e.body || JSON.stringify({ errors: [{ message: 'Ответ от сервера не был успешным' }] })
      }
    }
  }
}
const getParticipant = async function (code, isSandbox) {
  const url = new URL(`${process.env.API_HOST}/v1/events/${event_id}/participants`)

  if (isSandbox) {
    url.port = '8000'
  }

  const options = {
    params: {
      filter: {
        code: code
      }
    }
  }

  const response = await api.get(url.toString(), options)

  if (!response.status || response.status >= 400) {
    logger.error({ message: 'Ответ от сервера не был успешным' })

    throw {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ errors: [{ message: 'Ответ от сервера не был успешным' }] })
    }
  }

  const data = response.data

  if (data.length === 0) {
    logger.error({ message: 'Пользователь не найден' })

    throw {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ errors: 'Пользователь не найден' })
    }
  }

  if (data.length > 1) {
    logger.error({ message: 'Произошла ошибка. Напишите в техподдержку' })

    throw {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ errors: 'Произошла ошибка. Напишите в техподдержку' })
    }
  }

  if (!data[0] && !data[0].id) {
    logger.error({ message: 'Не найден ID пользователя' })

    throw {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ errors: 'Не найден ID пользователя' })
    }
  }

  return data[0]
}

const updateParticipantData = async function (participantId, participantData, isSandbox) {
  try {
    const url = new URL(`${process.env.API_HOST}/v1/events/${event_id}/participants/${participantId}`)

    if (isSandbox) {
      url.port = '8000'
    }

    const response = await api.patch(url.toString(), participantData)

    if (!response.status || response.status !== 200) {
      logger.error({ message: 'Ошибка отмены консультации' })

      throw {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify({ errors: [{ message: 'Ошибка отмены консультации' }] })
      }
    }

    return response.status
  } catch (error) {
    return error
  }
}
