const express = require('express')
const { sendEvent } = require('../kafkaProducer.js')

const app = express()
app.use(express.json())

app.post('/', async (req, res) => {
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
})

module.exports = app