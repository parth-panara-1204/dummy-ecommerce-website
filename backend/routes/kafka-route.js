const express = require('express')
const { sendEvent } = require('../kafkaProducer.js')

const app = express()
app.use(express.json())

app.post('/', async (req, res) => {
    
    const clickEvent = {
        userId: req.body.userId,
        productId: req.body.productId,
        timestamp: new Date().toISOString(),
        eventType: 'click'
    }

    await sendEvent('clickStream', clickEvent)

    res.status(200).send('event sent to kafka!')
})

module.exports = app