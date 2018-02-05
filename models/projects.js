var mysqlModel = require('mysql-model');
var db = require('../config/db');
var Category = require('./categories')

var connection = mysqlModel.createConnection(db.db_credentials);
  
var Projects = connection.extend({
    tableName: "projects",
});

Projects.draft = function(user){
	let project = new Projects({
		category_id: 0,
		user_id: user,
		aasm_state: 'draft'
	});
	console.log("voya guardar");
	project.save();
	return project;
}

module.exports = Projects;