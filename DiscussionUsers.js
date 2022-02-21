const mongoose = require("mongoose");

const DiscussionUsersSchema = new mongoose.Schema({
  discussionName: {
    type: String,
    required: true,
  },
  users: {
    type: Number,
    required: true,
    default: 0,
  },
});

const DiscussionUsers = mongoose.model(
  "DiscussionsUsers",
  DiscussionUsersSchema,
);

module.exports = DiscussionUsers;
