const { Kafka } = require('kafkajs')

const client = new Kafka({
    clientId: 'e-commerce',
    brokers: ['localhost:9092'],
})

const producer = client.producer()

const MAX_RETRIES = 5

const connectProducer = async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await producer.connect()
            console.log('kafka producer connected!')
            return
        } catch (err) {
            console.error(`producer connect failed (attempt ${attempt}/${MAX_RETRIES})`, err.message)
            if (attempt === MAX_RETRIES) throw err
        }
    }
}

const sendEvent = async (topic, message) => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await producer.send({
                topic: topic,
                messages: [
                    { value: JSON.stringify(message) }
                ],
            })
            return
        } catch (err) {
            console.error(`producer send failed (attempt ${attempt}/${MAX_RETRIES})`, err.message)
            if (attempt === MAX_RETRIES) throw err
            // Try to reconnect and retry
            try {
                await producer.disconnect()
            } catch (_) {}
            await connectProducer()
        }
    }
}

module.exports = {
    connectProducer,
    sendEvent,
}