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

app.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    // Explicitly check if email is already taken
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already in use" });
    }
    res.status(400).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || password === undefined || password === null) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
});

module.exports = app