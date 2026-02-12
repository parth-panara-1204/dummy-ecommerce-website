const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true },
  name: { type: String, required: true },
  password: {type: Number, required: true},
  email: { type: String, required: true, unique: true },
  gender: { type: String, required: true },
  city: { type: String, required: true },
  signup_date: { type: Date, default: Date.now }
});

userSchema.pre("save", async function () {
  if (!this.isNew) return;

  const maxUser = await this.constructor.findOne().sort({ user_id: -1 });
  this.user_id = maxUser ? maxUser.user_id + 1 : 1;
});

module.exports = mongoose.model("User", userSchema);
