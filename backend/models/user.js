const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    user_id: {type: String, required: true},
    name: {type: String, required: true},
    email: {type: String, required: true},
    gender: {type: String, required: true},
    city: {type: String, required: true},
    signup_data: {type: Date},
})

const user = mongoose.model("user", userSchema)
module.exports = user