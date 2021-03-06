var express = require('express');
var router = express.Router({mergeParams: true});
var middleware = require('../middleware/token_verify');

// Controllers.
var ctrlAuth = require('../controllers/authentication');
var ctrlProject = require('../controllers/project_controller');
var ctrlCategories = require('../controllers/categories_controller');
var crtlUser = require('../controllers/user_controller');
var ctrlTeam = require('../controllers/team_controller');
var ctrlContribute = require('../controllers/contribute_controller');

// Authentication.
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);
router.get('/validate_token', ctrlAuth.isLoggedIn);
router.post('/confirm_email', ctrlAuth.confirmEmail);
router.get('/test', ctrlAuth.test);

//Users.
router.get('/users/get_candidates', crtlUser.getPosibleLeaders);
router.get('/users/:id', crtlUser.fetchUser);
router.put('/users/:id', crtlUser.updateUser);
router.get('/users', crtlUser.fetchAllUsers);
router.put('/users/upf/:id', crtlUser.updateProfilePic);


//Team.
router.post('/dashboard/create_team', middleware.validateToken, crtlUser.createTeam);
router.get('/team', crtlUser.getTeams);
router.get('/teams', ctrlTeam.getTeams);
router.get('/team/:id', ctrlTeam.getTeam);
router.get('/teams/members/:id', ctrlTeam.getMembers);
router.post('/teams/members', ctrlTeam.setMember);
router.post('/teams/dMember', ctrlTeam.deleteMember);
//router.post('/team/member', ctrlTeam.setDraft);

// Projects.
router.get('/projects/draft', ctrlProject.setDraft);
router.post('/projects', ctrlProject.create);
router.get('/projects', ctrlProject.getProjects);
router.post('/projects/launch', ctrlProject.launch);
router.get('/projects/:id', ctrlProject.fetchProject);
router.put('/projects/:id', ctrlProject.updateProjects);
router.get('/projects/categories/:category', ctrlProject.getProjectsByCategory);
router.get('/backedProjects', ctrlProject.backedProjects);

//Contributes
router.post('/contribute',ctrlContribute.insertContribution);
router.get('/project/backers/:id', ctrlContribute.getBackers);
router.get('/project/backers', ctrlContribute.getAllBackers);


module.exports.validateToken = function (req, res, next) {
  let token = req.headers.auth;
  if (!token) {
    return res.status(202).send({ message: "TOKEN_ERROR: No valid token" })
  };
  jwt.verify(token, authConfig.jwt_secret, function (err, decoded) {
    if (err) {
      res.status(204).send(err);
      res.end();
      return;
    }else{
      res.local.id = decoded[user];
      next()
    }
  });
}

module.exports = router;