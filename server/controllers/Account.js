const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const models = require('../models');

const { Account } = models;

const loginPage = (req, res) => res.render('login');

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

const login = (req, res) => {
  const username = `${req.body.username}`;
  const pass = `${req.body.pass}`;

  // Are all fields filled in?
  if (!username || !pass) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  // Are fields correct?
  return Account.authenticate(username, pass, (err, account) => {
    if (err || !account) {
      return res.status(401).json({ error: 'Wrong username or password!' });
    }

    // req.session.account = Account.toAPI(account);
    req.session.account = {
      _id: account._id.toString(),
      username: account.username,
      following: account.following || [],
      blocking: account.blocking || [],
    };

    return res.json({ redirect: '/home' });
  });
};

const signup = async (req, res) => {
  const username = `${req.body.username}`;
  const pass = `${req.body.pass}`;
  const pass2 = `${req.body.pass2}`;

  // Are all fields filled in?
  if (!username || !pass || !pass2) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  // Do passwords match?
  if (pass !== pass2) {
    return res.status(400).json({ error: 'Passwords do not match!' });
  }

  // Hashing the password
  try {
    const hash = await Account.generateHash(pass);
    const newAccount = new Account({ username, password: hash });
    await newAccount.save();

    // req.session.account = Account.toAPI(newAccount);
    req.session.account = {
      _id: newAccount._id.toString(),
      username: newAccount.username,
      following: newAccount.following || [],
      blocking: newAccount.blocking || [],
    };

    return res.json({ redirect: '/home' });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already in use!' });
    }
    return res.status(500).json({ error: 'An error occured!' });
  }
};

const settingsPage = async (req, res) => {
  try {
    const account = await Account.findById(req.session.account._id).lean().exec();

    return res.render('settings', {
      meJSON: JSON.stringify(account),
    });
  } catch (err) {
    console.error('Error rendering settings page!', err);
    return res.status(500).render('500', { error: 'Unable to load settings' });
  }
};

const followUser = async (req, res) => {
  try {
    const userId = req.session.account._id;
    let { targetId } = req.body;

    if (userId === targetId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Convert targetId to ObjectId for MongoDB
    targetId = new mongoose.Types.ObjectId(targetId);

    await Account.updateOne(
      { _id: userId },
      { $addToSet: { following: targetId } }, // prevents duplicates
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Follow failed' });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const userId = req.session.account._id;
    let { targetId } = req.body;

    targetId = new mongoose.Types.ObjectId(targetId);

    await Account.updateOne(
      { _id: userId },
      { $pull: { following: targetId } },
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unfollow failed' });
  }
};

const blockUser = async (req, res) => {
  try {
    const userId = req.session.account._id;
    let { targetId } = req.body;

    if (userId === targetId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Convert targetId to ObjectId for MongoDB
    targetId = new mongoose.Types.ObjectId(targetId);

    await Account.updateOne(
      { _id: userId },
      { $addToSet: { blocking: targetId } }, // prevents duplicates
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Block failed' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.session.account._id;
    let { targetId } = req.body;

    targetId = new mongoose.Types.ObjectId(targetId);

    await Account.updateOne(
      { _id: userId },
      { $pull: { blocking: targetId } },
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unblock failed' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await Account.findById(req.session.account._id)
      .select('username following blocking')
      .lean()
      .exec();
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get user' });
  }
};

const changePassword = async (req, res) => {
  const { oldPass, newPass, newPass2 } = req.body;

  if (!oldPass || !newPass || !newPass2) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (newPass !== newPass2) {
    return res.status(400).json({ error: 'New passwords do not match' });
  }

  try {
    const account = await Account.findById(req.session.account._id).exec();
    if (!account) return res.status(400).json({ error: 'User not found' });

    // Compare old password
    const valid = await bcrypt.compare(oldPass, account.password);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Hash new password
    const newHash = await Account.generateHash(newPass);
    account.password = newHash;

    await account.save();

    return res.json({ message: 'Password successfully changed.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while changing password.' });
  }
};

module.exports = {
  loginPage,
  login,
  logout,
  signup,
  settingsPage,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  getCurrentUser,
  changePassword,
};
