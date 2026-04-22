/* eslint-disable no-console */
const fs = require('fs')
const mqtt = require('mqtt')

const [pk, dn, model = 'M1', outFile = 'D:/aiLocal/enjoy-web/mqtt-device-keepalive.log'] = process.argv.slice(2)
if (!pk || !dn) {
  console.error('Usage: node scripts/eiot/mqtt-keepalive-client.js <productKey> <deviceName> [model] [outFile]')
  process.exit(2)
}

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(outFile, line)
  process.stdout.write(line)
}

const clientId = `${pk}_${dn}_${model}`
const client = mqtt.connect('mqtt://127.0.0.1:18831', {
  clientId,
  username: dn,
  password: 'x',
  reconnectPeriod: 1000,
  clean: true,
  connectTimeout: 5000
})

const publishHeartbeat = () => {
  const payload = {
    id: `hb_${Date.now()}`,
    method: 'thing.event.property.post',
    params: {
      p_text: 'keepalive-online',
      p_bool: true,
      p_enum: 1
    }
  }
  client.publish(
    `/sys/${pk}/${dn}/s/thing/event/property/post`,
    JSON.stringify(payload),
    { qos: 1 },
    (err) => {
      if (err) {
        log(`HEARTBEAT_ERR ${err.message}`)
        return
      }
      log(`HEARTBEAT_SENT id=${payload.id}`)
    }
  )
}

let timer = null
client.on('connect', () => {
  log(`CONNECTED clientId=${clientId}`)
  client.subscribe(`/sys/${pk}/${dn}/c/#`, { qos: 1 }, (err) => {
    if (err) {
      log(`SUBSCRIBE_ERR ${err.message}`)
      return
    }
    log('SUBSCRIBED /c/#')
    publishHeartbeat()
    timer = setInterval(publishHeartbeat, 30000)
  })
})

client.on('message', (topic, payload) => {
  const text = payload.toString()
  log(`DOWNLINK topic=${topic} payload=${text}`)
  try {
    const msg = JSON.parse(text)
    const method = String(msg?.method || '')
    if (method.startsWith('thing.service.') && !method.endsWith('_reply')) {
      const serviceName = method.replace('thing.service.', '')
      if (serviceName !== 'property.set' && serviceName !== 'property.get') {
        const replyTopic = `/sys/${pk}/${dn}/s/thing/service/${serviceName}_reply`
        const replyPayload = {
          id: msg?.id || `reply_${Date.now()}`,
          method: `thing.service.${serviceName}_reply`,
          code: 0,
          params: {
            out_bool: 1,
            out_enum: 2,
            out_int32: 303,
            out_int64: '999999999',
            out_float: 12.34,
            out_double: 56.789,
            out_string: 'service-reply-string',
            out_text: 'service reply long text',
            out_date: '2026-04-22',
            out_datetime: '2026-04-22 16:45:00',
            out_position: '31.2304,121.4737',
            out_object3: { batch: 'B20260422', score: 98.7, ok: 1 },
            out_array3: [{ group: 'g1', count: 2 }]
          }
        }
        client.publish(replyTopic, JSON.stringify(replyPayload), { qos: 1 }, (err) => {
          if (err) {
            log(`SERVICE_REPLY_ERR service=${serviceName} err=${err.message}`)
            return
          }
          log(`SERVICE_REPLY_SENT service=${serviceName} topic=${replyTopic}`)
        })
      }
    }
  } catch (e) {
    log(`DOWNLINK_PARSE_ERR ${e.message}`)
  }
})

client.on('error', (err) => {
  log(`ERROR ${err.message}`)
})

process.on('SIGTERM', () => {
  if (timer) clearInterval(timer)
  client.end(true, () => process.exit(0))
})

process.on('SIGINT', () => {
  if (timer) clearInterval(timer)
  client.end(true, () => process.exit(0))
})
