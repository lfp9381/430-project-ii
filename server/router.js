const controllers = require('./controllers');
const mid = require('./middleware');

const router = (app) => {
  app.get('/getPosts', mid.requiresLogin, controllers.Post.getPosts);

  app.get('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);
  app.post('/login', mid.requiresSecure, mid.requiresLogout, controllers.Account.login);

  app.post('/signup', mid.requiresSecure, mid.requiresLogout, controllers.Account.signup);

  app.get('/logout', mid.requiresLogin, controllers.Account.logout);

  app.get('/home', mid.requiresLogin, controllers.Post.homePage);
  app.post('/home', mid.requiresLogin, controllers.Post.makePost);

  app.get('/', mid.requiresSecure, mid.requiresLogout, controllers.Account.loginPage);

  app.post('/follow', mid.requiresLogin, controllers.Account.followUser);
  app.post('/unfollow', mid.requiresLogin, controllers.Account.unfollowUser);
  app.post('/block', mid.requiresLogin, controllers.Account.blockUser);
  app.post('/unblock', mid.requiresLogin, controllers.Account.unblockUser);
  app.get('/me', mid.requiresLogin, controllers.Account.getCurrentUser);

  app.use(mid.pageNotFound);
};

module.exports = router;
