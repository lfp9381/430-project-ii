const mongoose = require('mongoose');
const _ = require('underscore');

const setContent = (content) => _.escape(content).trim();

const PostSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    set: setContent,
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: 'Account',
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

PostSchema.statics.toAPI = (doc) => ({
  content: doc.content,
});

const PostModel = mongoose.model('Post', PostSchema);
module.exports = PostModel;
