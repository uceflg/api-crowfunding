var express = require('express');
var router = express.Router();


// Controllers.
var ctrlAuth = require('../controllers/authentication');
var ctrlProject = require('../controllers/project_controller');
var ctrlCategories = require('../controllers/categories_controller');
var crtlUser = require('../controllers/user_controller');

// Authentication.
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);
router.get('/validate_token', ctrlAuth.isLoggedIn);

//Users.
router.get('/users/:id', crtlUser.fetchUser);
router.post('/team', crtlUser.createTeam);
router.get('/team', crtlUser.getTeams)
// Projects.
router.get('/projects/draft', ctrlProject.setDraft);
router.post('/projects', ctrlProject.create);
router.get('/projects', ctrlProject.getProjects);
router.post('/projects/launch', ctrlProject.launch);
router.get('/projects/:id', ctrlProject.fetchProject);
router.put('/projects/:id', ctrlProject.updateProjects);

// Categories.
router.get('/category', ctrlCategories.getAll)


module.exports = router;