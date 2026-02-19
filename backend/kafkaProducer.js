const { Kafka } = require('kafkajs')

const client = new Kafka({
    clientId: 'e-commerce',
    brokers: ['localhost:9092'],
})

const producer = client.producer()

const connectProducer = async () => {
    await producer.connect()
    console.log('kafka producer connected!')
}

const sendEvent = async (topic, message) => {
    await producer.send({
        topic: topic,
        messages: [
            {value: JSON.stringify(message)}
        ],
    })
}

module.exports = {
    connectProducer,
    sendEvent,
}