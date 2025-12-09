const models = require('../models');

const { Post } = models;

const homePage = async (req, res) => res.render('app');

const makePost = async (req, res) => {
  if (!req.body.content) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  const postData = {
    content: req.body.content,
    creator: req.session.account._id,
  };

  try {
    let newPost = new Post(postData);
    await newPost.save();

    // Populate the creator field so the frontend can access username and _id
    newPost = await newPost.populate('creator', 'username');

    return res.status(201).json(newPost); // send the full post object
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Post already exists!' });
    }
    return res.status(500).json({ error: 'An error occurred making post!' });
  }
};

const getPosts = async (req, res) => {
  try {
    const query = {};
    // const query = {creator: req.session.account._id};
    const docs = await Post.find(query).populate('creator', 'username').lean()
      .exec();

    return res.json({ posts: docs });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error retrieving posts!' });
  }
};

module.exports = {
  homePage,
  makePost,
  getPosts,
};
