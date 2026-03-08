const express = require('express')
const { sendEvent } = require('../kafkaProducer.js')

const app = express()
app.use(express.json())

app.post('/', async (req, res) => {
    try {
        const { userId, productId, eventType, ...rest } = req.body

        const event = {
            userId,
            productId,
            eventType: eventType || 'click',
            timestamp: new Date().toISOString(),
            ...rest
        }

        await sendEvent('clickStream', event)

        res.status(200).send('event sent to kafka!')
    } catch (err) {
        console.error('Failed to send click event to Kafka:', err)
        res.status(500).json({ error: 'Failed to send click event' })
    }
})

module.exports = app