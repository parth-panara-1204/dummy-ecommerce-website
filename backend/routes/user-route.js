const mongoose = require("mongoose")
const User = require('../models/user.js')
const express = require('express')

const app = express()
app.use(express.json())

app.get("/", async (req, res) => {
  try {
    const user_data = await User.find();
    res.json(user_data);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Failed to get users" });
  }
});

module.exports = app