const mongoose = require("mongoose");
const Counter = require('../models/counter.js')

const userSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  gender: { type: String, required: true },
  city: { type: String, required: true },
  signup_date: { type: Date, default: Date.now }
});

userSchema.pre("save", async function () {
  if (!this.isNew) return;

  const counter = await Counter.findByIdAndUpdate(
    { _id: "user_id" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.user_id = counter.seq;
});

module.exports = mongoose.model("User", userSchema);
