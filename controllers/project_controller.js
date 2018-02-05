//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var randtoken = require('rand-token');
var Projects = require('../models/projects');
var Rewards = require('../models/rewards');
var Users = require('../models/users');
var cloudify = require('./image_uploader');
var db = require('../config/db');
var connection = mysql.createConnection(db.db_credentials);

exports.getProjects = function(req, res){
	connection.query(`SELECT	projects.id,
														projects.title,
														projects.video_url,
														projects.pledged_amount,
														projects.funded_amount,
														ROUND(projects.funded_amount/projects.pledged_amount,1) AS percent_funded,
														projects.end_date,
														projects.funding_model,
														projects.start_date,
														projects.duration,
														projects.category_id,
														categories.name as category_name,
														users.name as user_name,
														projects.total_backers,
														(SELECT pictures.url
															FROM   pictures
															WHERE  pictures.project_id = projects.id
															AND    projects.id = (SELECT MIN(pictures1.id)
																										FROM   pictures pictures1
																										WHERE  pictures1.project_id = pictures.project_id)) as image_url,
														projects.currency,
														stories.body as story,
														true as can_edit,
														projects.aasm_state as current_state,
														TIMESTAMPDIFF(DAY, NOW(), DATE_ADD(projects.start_date, INTERVAL projects.duration DAY)) as remaining_duration,
														false as is_favourite_project,
														CASE WHEN (projects.pledged_amount - projects.funded_amount) <= 0 THEN true ELSE false END as is_funded
										FROM	projects,
													categories,
													users,
													stories
										WHERE	categories.id = projects.category_id
										AND	users.id = projects.user_id
										AND   stories.project_id = projects.id`, function(error, results, fields){
		if (error) throw error;
		project = results;
		res
			.status(200)
			.json({
				project	
			})
		res.end();
	});
}

exports.setDraft = function(req, res){
	let token = req.headers.authorization
	let user = jwt.decode(token);
	user = user.user
	
	let project;
	let rewards;
	connection.query('SELECT * FROM `projects` WHERE `user_id` = ? AND aasm_state = "draft"', [user], function(error, results, fields){
		if (error) throw error;
		project = results[0];
		if(project){
			getProject(project.id, res);
		}else{
			console.log("entre aca no se porque");
			var now = new Date();
			let draft = new Projects({
				category_id: 0,
				user_id: user,
				aasm_state: 'draft',
				created_at: dateFormat(now, "isoDateTime"),
				updated_at: dateFormat(now, "isoDateTime")
			});
			draft.save();
			project = draft;
			res
				.status(200)
				.json({
					project
				})
			res.end();
		}//End if
		
	});
	return;
}

exports.create = function(req,res){

	const projectInfo = req.body;
	console.log(projectInfo);
	const projectFind = new Projects();
	const projectDraft = new Projects();
	let project;
	let rewards;
	//project.set('id', projectInfo.id);
	//project.save();
	switch(projectInfo.type){
		case 'project': {
			saveProject(projectInfo, res);
			break;					
		}
		case 'reward': {			
			saveRewards(projectInfo, res);
			break;
		} //End case Rewards
		case 'story': {
			saveStory(projectInfo, res);	
			break;
		}
		case 'faq':{
			saveFaqs(projectInfo, res);
			break;
		}
	}	
	return;
}

exports.launch = function(req,res){
	const projectInfo = req.body;

	connection.query('UPDATE projects SET aasm_state = ? WHERE id = ?', 
		['pending_approval', 
		projectInfo.id], function(error, results, fields){
			if(error){
				res
					.status(200)
					.json({
						status: false
					})
				res.end();
			}else{
				res
					.status(200)
					.json({
						status: true
					})
				res.end();
			}
		});
	
}

exports.fetchProject = function(req, res){
	let projectInfo = req.params;
	getProject(projectInfo.id, res);
}

exports.updateProjects = function(req, res){
	let projectInfo = req.body;
	//console.log(projectInfo);
	switch(projectInfo.type){
		case 'project': {
			updateProj(projectInfo, res);
			break;
		}
		case 'reward': {			
			saveRewards(projectInfo, res);
			break;
		} //End case Rewards
		case 'story': {
			saveStory(projectInfo, res);	
			break;
		}
		case 'faq':{
			saveFaqs(projectInfo, res);
			break;
		}
	}
}

saveProject = function(projectInfo, res){
	let foundOne;
	let project;

	connection.query('SELECT * FROM `projects` WHERE `id` = ? ', [projectInfo.id], function(error, results, fields){
		if(error) throw error;
		project = results[0];
		if(project){
			var now = new Date();
			connection.query('UPDATE projects SET video_url = ?, updated_at = ? WHERE id = ?', 
				[projectInfo.video_url,
				 dateFormat(now, "isoDateTime"), 
				 projectInfo.id]);
		}else{
			var now = new Date();

			let projectJson = {
				title: projectInfo.title,
				category_id: projectInfo.category_id,
				aasm_state: 'draft',
				video_url: projectInfo.video_url,
				pledged_amount: projectInfo.pledged_amount,
				funding_model: projectInfo.funding_model,
				start_date: dateFormat(projectInfo.start_date, 'isoDateTime'),
				currency: projectInfo.currency,
				duration: projectInfo.duration,
				updated_at: dateFormat(now, "isoDateTime")
			};

			connection.query('INSERT INTO projects SET ?', projectJson, function(error, results, fields){
				if(error) throw error;
				console.log("inserte!");
			}); //Fin Insert
		}

		getProject(projectInfo.id, res);

	});	

	return;
}

saveRewards = function(projectInfo, res){
	let foundOne;
	let project;
	let rowsRewards = projectInfo.rewards_attributes;
	let reward;

	connection.query('SELECT * FROM `projects` WHERE `id` = ?', [projectInfo.id], function(error, results, fields){
		if (error) throw error;
		project = results[0];
	});

	
	for(i in rowsRewards){
		connection.query('SELECT * FROM `rewards` WHERE `project_id` = ? AND `id` = ?', [projectInfo.id, rowsRewards[i].id], function(error, results, fields){
			if(error) throw error;
			reward = result[0];
			if(reward){
				var now = new Date();
				connection.query('UPDATE rewards SET title = ?, description = ?, amount = ?, updated_at = ?, delivery_date = ?, quantity = ? WHERE id = ?', 
					[rowsRewards[i].title, 
					rowsRewards[i].description, 
					rowsRewards[i].amount, 
					dateFormat(now, "isoDateTime"), 
					dateFormat(rowsRewards[i].delivery_date, 'isoDateTime'), 
					rowsRewards[i].quantity, 
					rowsRewards[i].id]);
			}else{
				var now = new Date();

				let rewardSave = {
					title: projectInfo.rewards_attributes[i].title,
					description: projectInfo.rewards_attributes[i].description,
					amount: projectInfo.rewards_attributes[i].amount,
					project_id: projectInfo.id,
					created_at: dateFormat(now, "isoDateTime"),
					updated_at: dateFormat(now, "isoDateTime"),
					delivery_date: dateFormat(projectInfo.rewards_attributes[i].delivery_date, 'isoDateTime'),
					quantity: projectInfo.rewards_attributes[i].quantity,
					currency: 'CLP',
					backers_count: 0,
					contain_shipping_locations: projectInfo.rewards_attributes[i].contain_shipping_locations
				};

				connection.query('INSERT INTO rewards SET ?', rewardSave, function(error, results, fields){
					if(error) throw error;
					console.log("inserte!");
				}); //Fin Insert	
			}
		});
	}

	getProject(projectInfo.id, res);

	return;
}

saveStory = function(projectInfo, res){
	let foundOne;
	let storySave = projectInfo.story_attributes;
	let story;

	connection.query('SELECT * FROM `stories` WHERE `project_id` = ? AND `id` = ?', [projectInfo.id, storySave.id], function(error, results, fields){
		if(error) throw error;
		story = results[0];
		if(story){
			var now = new Date();
			connection.query('UPDATE stories SET updated_at = ?, body = ?, WHERE id = ?', 
				[dateFormat(now, "isoDateTime"), 
				storySave.body, 
				storySave.id]);
		}else{
			var now = new Date();

			let storyJson = {
				project_id: projectInfo.id,
				created_at: dateFormat(now, "isoDateTime"),
				updated_at: dateFormat(now, "isoDateTime"),
				body: storySave.body
			};

			connection.query('INSERT INTO stories SET ?', storyJson, function(error, results, fields){
				if(error) throw error;
				console.log("inserte!");
			}); //Fin Insert	
			
		}
		getProject(projectInfo.id, res);
	});	

	return;
}

saveFaqs = function(projectInfo, res){
	let project;
	let rowsFaqs = projectInfo.faqs_attributes;
	let faqs;
	
	for(i in rowsFaqs){
		connection.query('SELECT * FROM `faqs` WHERE `project_id` = ? AND `id` = ?', [projectInfo.id, rowsFaqs[i].id], function(error, results, fields){
			if(error) throw error;
			faqs = results[0];
			if(faqs){
				var now = new Date();
				connection.query('UPDATE faqs SET question = ?, answer = ?, project_id = ?, updated_at = ?, WHERE id = ?', 
					[rowsFaqs[i].question, 
					rowsFaqs[i].answer, 
					projectInfo.id, 
					dateFormat(now, "isoDateTime"),
					rowsFaqs[i].id]);
			}else{
				var now = new Date();

				let rewardSave = {
					question: projectInfo.faqs_attributes[i].question,
					answer: projectInfo.faqs_attributes[i].answer,
					project_id: projectInfo.id,
					created_at: dateFormat(now, "isoDateTime"),
					updated_at: dateFormat(now, "isoDateTime")
				};

				connection.query('INSERT INTO faqs SET ?', rewardSave, function(error, results, fields){
					if(error) throw error;
					console.log("inserte!");
				}); //Fin Insert	
			}
		});
	}

	getProject(projectInfo.id, res);

	return;
}

getProject = function(id, res){
	let project;
	let rewards;
	let story;
	let faqs;
	let pictures;

	connection.query('SELECT * FROM `projects` WHERE `id` = ?', [id], function(error, results, fields){
		if (error) throw error;
		project = results[0];
		//Get Rewards.
		connection.query('SELECT * FROM `rewards` WHERE `project_id` = ?', [id], function(error, results, fields){
			if (error) throw error;
			rewards = results;
			project.rewards = rewards;
			//Get Stories.
			connection.query('SELECT * FROM `stories` WHERE `project_id` = ?', [id], function(error, results, fields){
				if (error) throw error;
				story = results[0];
				project.story = story;
				//Get Faqs.
				connection.query('SELECT * FROM `faqs` WHERE `project_id` = ?', [id], function(error, results, fields){
					if (error) throw error;
					faqs = results;
					project.faqs = faqs;
					//Get Pictures.
					connection.query('SELECT id, url FROM `pictures` WHERE `project_id` = ?', [id], function(error, results, fields){
						if (error) throw error;
						pictures = results;
						project.pictures = pictures;
						res
							.status(200)
							.json({
								project	
							})
						res.end();
					});
				});
			});
		});
	});

	

	
}

updateProj = function(projectInfo, res){
	var now = new Date();
	console.log(projectInfo);
	connection.query('UPDATE projects SET video_url = ?, updated_at = ? WHERE id = ?', 
		[projectInfo.video_url,
		 dateFormat(now, "isoDateTime"), 
		 projectInfo.id],
		function(error, results, fields){
			if(projectInfo.images_data){
				for(let i of projectInfo.images_data){
					cloudify.upload_image(i, function(data){
						if(!data.error){
							connection.query(`INSERT INTO pictures SET ? `, {url: data.url, created_at: dateFormat(now, "isoDateTime"), updated_at: dateFormat(now, "isoDateTime"), project_id: projectInfo.id}, function(error, results, fields){
								if(error) throw error;
								
							})
						}
					});
				}
			}
			for(let i of projectInfo.pictures_attributes){
				if(i._destoy){
					connection.query('DELETE FROM pictures WHERE id = ?', i.id, function(error, results, fields){
						if(error) throw error;
					})
				}
			}
			getProject(projectInfo.id, res);
		}
	);
	return;
}



findById = function(id){
	let project;
	const projectFind2 = new Projects();

	projectFind2
		.find('all', 
			{ where: "id = '" + id + "'"},
			function(err, rows){
				if(err){
					console.log('error');
					res.end();
				}						
				project = rows[0];
				console.log("resultado", rows[0]);
				project.rewards = [new Rewards];
				
			});
	return project;

}

exports.test = function(req, res){
	var d = new Date();
	dateFormat(d, "isoDateTime");
	console.log(dateFormat(d, "isoDateTime"));
}