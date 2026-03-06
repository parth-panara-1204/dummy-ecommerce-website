const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: 'e-commerce-consumer',
  brokers: ['localhost:9092'],
})

const consumer = kafka.consumer({ groupId: 'clickstream-loggers' })

const MAX_RETRIES = 5

async function start() {
  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await consumer.connect()
        console.log('Kafka consumer connected')
        break
      } catch (err) {
        console.error(`consumer connect failed (attempt ${attempt}/${MAX_RETRIES})`, err.message)
        if (attempt === MAX_RETRIES) throw err
      }
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await consumer.subscribe({ topic: 'clickStream', fromBeginning: true })
        console.log('Subscribed to topic: clickStream')
        break
      } catch (err) {
        console.error(`consumer subscribe failed (attempt ${attempt}/${MAX_RETRIES})`, err.message)
        if (attempt === MAX_RETRIES) throw err
      }
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value ? message.value.toString() : ''
        let parsed
        try {
          parsed = JSON.parse(value)
        } catch {
          parsed = value
        }
        console.log({ topic, partition, offset: message.offset, event: parsed })
      },
      onCrash: async (err) => {
        console.error('Consumer crashed, will restart shortly', err)
        try {
          await consumer.disconnect()
        } catch (_) {}
        start()
      }
    })
  } catch (err) {
    console.error('Kafka consumer error:', err)
    process.exit(1)
  }
}

const shutdown = async () => {
  try {
    console.log('Shutting down consumer...')
    await consumer.disconnect()
  } catch (err) {
    console.error('Error during shutdown:', err)
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()
