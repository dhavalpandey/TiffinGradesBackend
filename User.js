const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
    unique: 1,
  },
  fullName: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  dateOfCreation: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
