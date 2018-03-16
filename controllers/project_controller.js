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
var authConfig = require('../config/auth_conf');
var pool = mysql.createPool(db.db_credentials);

exports.getProjects = function(req, res){
	let project;
	pool.getConnection(function(error, connection){
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
														team.name as user_name,
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
							FROM 		projects
							INNER JOIN	categories ON categories.id = projects.category_id
							INNER JOIN	team ON team.id = projects.team_id
							LEFT JOIN	stories ON stories.project_id = projects.id
							WHERE projects.aasm_state = 'funding'`, 
		function(error, results, fields){
			connection.release();
			if (error) throw error;
			project = results;
			res
				.status(200)
				.json({
					project	
				})
			res.end();
			return;
		});
	});
}

exports.setDraft = function(req, res){
	let token = req.headers.authorization
	let user = jwt.decode(token);
	let project;
	let rewards;
	let role;
	user = user.user;
	pool.getConnection(function(error, connection){
		connection.query(`SELECT	roles.name,
															(SELECT user_team.team_id
															FROM		user_team
															WHERE 	user_team.user_id = users.id
															AND		user_team.editor = 1) as team_id 
											FROM 		users, 
															roles
											WHERE		users.id = ? 
											AND 		roles.id = users.role_id`, [user], function(error, results, fields){
			if(error) throw error;
			role = results[0];
			if(role.name == 'admin'){
				
				connection.query('SELECT * FROM `projects` WHERE `team_id` IS NULL AND aasm_state = "draft"', function(error, results, fields){
					if (error) throw error;
					project = results[0];
					if(project){
						getProject(project.id, res);
					}else{
						var now = new Date();

						connection.query('INSERT INTO projects(category_id, aasm_state, created_at, updated_at) VALUES(?, ?, ?, ?)', 
							[0, 
							'draft',
							dateFormat(now, "isoDateTime"), 
							dateFormat(now, "isoDateTime")]);

						connection.query('SELECT * FROM projects WHERE team_id IS NULL and aasm_state = "draft"', function(error, results, fields){
							connection.release();
							if(error) throw error;
							project = results[0];
							res
								.status(200)
								.json({
									project
								})
							res.end();
							return;
						});
					}//End if
					
				});
			}else{
				connection.query('SELECT * FROM `projects` WHERE `team_id` = ? AND aasm_state = "draft"', [user.team_id], function(error, results, fields){
					if (error) throw error;
					project = results[0];
					if(project){
						getProject(project.id, res);
					}else{
						var now = new Date();
						var now = new Date();

						connection.query('INSERT INTO projects(category_id, aasm_state, team_id, created_at, updated_at) VALUES(?, ?, ?, ?, ?)', 
							[0, 
							'draft',
							role.team_id,
							dateFormat(now, "isoDateTime"), 
							dateFormat(now, "isoDateTime")]);

						connection.query('SELECT * FROM projects WHERE team_id = ? and aasm_state = "draft"',[role.team_id], function(error, results, fields){
							connection.release();
							if(error) throw error;
							project = results[0];
							res
								.status(200)
								.json({
									project
								})
							res.end();
							return;
						});
					}//End if				
				});
			}
		});
	});
}

exports.create = function(req,res){

	const projectInfo = req.body;
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
	let token = req.headers.authorization;
	let role;
	let state;
	jwt.verify(token, authConfig.jwt_secret, function(err, decoded){
		if(err){
				res.status(401).send(err);
				res.end();
		}
		pool.getConnection(function(error, connection){
			connection.query(`SELECT	role_id
												FROM		users
												WHERE   id = ?
												`,
				[decoded.user], 
				function(error, results, fields){
					if(error) throw error;
					role = results[0].role_id;
					state = role == 1 ? 'funding' : 'pending_approval';
					connection.query('UPDATE projects SET aasm_state = ? WHERE id = ?', 
						[state, 
						projectInfo.id], function(error, results, fields){
							connection.release();
							if(error){
								res
									.status(200)
									.json({
										status: false
									})
								res.end();
								return;
							}else{
								res
									.status(200)
									.json({
										status: true
									})
								res.end();
								return;
							}
						});
				});
		});
	});
}

exports.fetchProject = function(req, res){
	let projectInfo = req.params;
	getProject(projectInfo.id, res);
}

exports.updateProjects = function(req, res){
	let projectInfo = req.body;
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
	pool.getConnection(function(error, connection){
		connection.query('SELECT * FROM `projects` WHERE `id` = ? AND title IS NOT NULL', [projectInfo.id], function(error, results, fields){
			if(error) throw error;
			project = results[0];
			if(project){
				var now = new Date();
				connection.query('UPDATE projects SET video_url = ?, team_id = ?, updated_at = ? WHERE id = ?', 
					[projectInfo.video_url,
					projectInfo.team_id,
					dateFormat(now, "isoDateTime"), 
					projectInfo.id]);
					connection.release();
			}else{
				var now = new Date();
				
				connection.query(`UPDATE 	projects 
													SET 		title = ?, 
																	team_id = ?, 
																	category_id = ?, 
																	aasm_state = ?, 
																	video_url = ?, 
																	pledged_amount = ?,
																	funding_model = ?,
																	start_date = ?,
																	currency = ?,
																	duration = ?,
																	updated_at = ?
													WHERE   id = ?`, [projectInfo.title,
																						projectInfo.team_id,
																						projectInfo.category_id,
																						'draft',
																						projectInfo.video_url,
																						projectInfo.pledged_amount,
																						projectInfo.funding_model,
																						dateFormat(projectInfo.start_date, 'isoDateTime'),
																						projectInfo.currency,
																						projectInfo.duration,
																						dateFormat(now, "isoDateTime"),
																						projectInfo.id], function(error, results, fields){
					connection.release();
					if(error) throw error;
				}); //Fin Insert
			}

			getProject(projectInfo.id, res);

		});	

		return;
	})
}

saveRewards = function(projectInfo, res){
	let foundOne;
	let project;
	let rowsRewards = projectInfo.rewards_attributes;
	let reward;
	pool.getConnection(function(error, connection){
		connection.query('SELECT * FROM `projects` WHERE `id` = ?', [projectInfo.id], function(error, results, fields){
			if (error) throw error;
			project = results[0];
		});

		
		for(i in rowsRewards){
			connection.query('SELECT * FROM `rewards` WHERE `project_id` = ? AND `id` = ?', [projectInfo.id, rowsRewards[i].id], function(error, results, fields){
				if(error) throw error;
				reward = results	[0];
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
						connection.release();
						if(error) throw error;
					}); //Fin Insert	
				}
			});
		}

		getProject(projectInfo.id, res);

		return;
	});
}

saveStory = function(projectInfo, res){
	let foundOne;
	let storySave = projectInfo.story_attributes;
	console.log(projectInfo.id);
	let story;
	pool.getConnection(function(error, connection){
		connection.query('SELECT * FROM stories WHERE project_id = ? AND id = ?', [projectInfo.id, storySave.id], function(error, results, fields){
			if(error) throw error;
			story = results[0];
			if(story){
				console.log(story);
				var now = new Date();
				connection.query('UPDATE stories SET updated_at = ?, body = ? WHERE id = ?', 
					[dateFormat(now, "isoDateTime"), 
					storySave.body, 
					story.id], function(error, results, fields){
						if(error){
							console.log(error);
							throw error
						}else{
							console.log("guarde ctm");
							console.log(results);
						}
						getProject(projectInfo.id, res);
					});
					connection.release();
					
			}else{
				var now = new Date();

				let storyJson = {
					project_id: projectInfo.id,
					created_at: dateFormat(now, "isoDateTime"),
					updated_at: dateFormat(now, "isoDateTime"),
					body: storySave.body
				};

				connection.query('INSERT INTO stories SET ?', storyJson, function(error, results, fields){
					connection.release();
					if(error) throw error;
					getProject(projectInfo.id, res);
				}); //Fin Insert	
				
			}
			
		});	
		return;
	});
}

saveFaqs = function(projectInfo, res){
	let project;
	let rowsFaqs = projectInfo.faqs_attributes;
	let faqs;
	pool.getConnection(function(error, connection){
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
					}); //Fin Insert	
				}
			});
		}
		connection.release();

		getProject(projectInfo.id, res);

		return;
	});
}

getProject = function(id, res){
	let project;
	let rewards;
	let story;
	let faqs;
	let pictures;
	let team;
	pool.getConnection(function(error, connection){
		connection.query(`SELECT 	projects.id,
															projects.title,
															projects.video_url,
															projects.pledged_amount,
															projects.currency,
															projects.end_date,
															projects.team_id,
															projects.funded_amount,
															ROUND((projects.funded_amount/projects.pledged_amount)*100) as percent_funded,
															projects.funding_model,
															projects.start_date,
															projects.duration,
															categories.id as category_id,
															categories.name as category_name,
															team.name as team_name,
															projects.total_backers,
															false as can_edit,
															projects.aasm_state as current_state,
															TIMESTAMPDIFF(DAY, NOW(), DATE_ADD(projects.start_date, INTERVAL projects.duration DAY)) as remaining_duration,
															CASE WHEN (projects.pledged_amount - projects.funded_amount) <= 0 THEN true ELSE false END as is_funded
											FROM	projects
											INNER JOIN	categories ON categories.id = projects.category_id
											LEFT JOIN	team ON team.id = projects.team_id
											WHERE projects.id = ?`, [id], function(error, results, fields){
			if (error) throw error;
			project = results[0];
			if(!project){
				connection.release();
				res
					.status(200)
					.json({
						project	
					})
				res.end();
				return;
			}
			//Get Rewards.
			connection.query('SELECT id, title, description, amount, delivery_date, quantity, currency, backers_count FROM `rewards` WHERE `project_id` = ?', [id], function(error, results, fields){
				if (error) throw error;
				rewards = results;
				rewards ? project.rewards = rewards : [];
				//Get Stories.
				connection.query('SELECT id, body FROM `stories` WHERE `project_id` = ?', [id], function(error, results, fields){
					if (error) throw error;
					story = results[0];
					story ? project.story = story : {};
					//Get Faqs.
					connection.query('SELECT id, question, answer FROM `faqs` WHERE `project_id` = ?', [id], function(error, results, fields){
						if (error) throw error;
						faqs = results;
						faqs ? project.faqs = faqs : [];
						//Get Pictures.
						connection.query('SELECT id, url FROM `pictures` WHERE `project_id` = ?', [id], function(error, results, fields){
							if (error) throw error;
							pictures = results;
							pictures ? project.pictures = pictures : [];
							connection.query('SELECT id, name, logo_url, description FROM team WHERE id = ?', [project.team_id], function(error, results, fields){
								connection.release();
								if(error) throw error;
								team = results[0];
								team ? project.team = team : {};
								res
									.status(200)
									.json({
										project	
									})
								res.end();
								return;
							});
						});
					});
				});
			});
		});
	});
}

updateProj = function(projectInfo, res){
	var now = new Date();
	pool.getConnection(function(error, connection){
		connection.query('UPDATE projects SET title = ?, category_id = ?, pledged_amount= ?, duration = ?, video_url = ?, start_date = ?, updated_at = ? WHERE id = ?', 
			[projectInfo.title,
			 projectInfo.category_id,
			 projectInfo.pledged_amount,
			 projectInfo.duration,
			 projectInfo.video_url,
			 dateFormat(projectInfo.start_date, 'isoDateTime'),
			 dateFormat(now, "isoDateTime"), 
			projectInfo.id],
			function(error, results, fields){
				if(projectInfo.images_data){
					for(let i of projectInfo.images_data){
						cloudify.upload_image(i, function(data){
							if(!data.error){
								connection.query(`INSERT INTO pictures(url, created_at, updated_at, project_id) VALUES (?, ? ,? ,?) `, [data.url, dateFormat(now, "isoDateTime"), dateFormat(now, "isoDateTime"), projectInfo.id], function(error, results, fields){
									if(error) throw error;
									
								})
							}
							else{
								console.log(data.error);
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
				connection.release();
				getProject(projectInfo.id, res);
			}
		);
		return;
	});
}

exports.getProjectsByCategory = function(req, res){
	let project;
	let categoria = req.params.category;
	pool.getConnection(function(error, connection){
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
									team.name as user_name,
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
							FROM 		projects
							INNER JOIN	categories 
									ON categories.id = projects.category_id
							INNER JOIN	team ON team.id = projects.team_id
							LEFT JOIN	stories ON stories.project_id = projects.id
							WHERE projects.aasm_state = 'funding'`,
							[categoria], 
		function(error, results, fields){
			connection.release();
			if (error) throw error;
			project = results;
			res
				.status(200)
				.json({
					project	
				})
			res.end();
			return;
		});
	});
}