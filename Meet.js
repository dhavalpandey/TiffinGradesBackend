const mongoose = require("mongoose");

const MeetSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
  },
  subject: {
    required: true,
    type: String,
  },
  meetName: {
    required: true,
    type: String,
  },
  creatorName: {
    required: true,
    type: String,
  },
  createdAt: {
    required: true,
    type: Number,
  },
  expiringAt: {
    required: true,
    type: Number,
  },
  profilePicture: {
    required: true,
    type: String,
  },
});

const Meet = mongoose.model("Meet", MeetSchema);

module.exports = Meet;
