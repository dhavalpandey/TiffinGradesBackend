const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  numberOfUpdates: {
    required: false,
    type: Number,
    default: 0,
  },
  points: {
    required: false,
    type: Number,
    default: 0,
  },
});

const Subject = mongoose.model("Subject", SubjectSchema);

module.exports = Subject;
