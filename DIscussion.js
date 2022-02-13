const mongoose = require("mongoose");

const DiscussionSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
  },
  discussionName: {
    type: String,
    required: true,
  },
});

const Discussion = mongoose.model("Discussions", DiscussionSchema);

module.exports = Discussion;
