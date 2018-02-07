//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var db = require('../config/db');
var connection;

exports.fetchUser = function(req, res){
  let userInfo = req.params;
  let user;
  createConnection();
  connection.query(`SELECT	users.id, 
                            users.name, 
                            users.image_url, 
                            users.email, 
                            users.secondary_email, 
                            users.phone_no, 
                            roles.name as role_name,
                            (SELECT	COUNT(*)
                             FROM  	project_backers
                             WHERE 	project_backers.user_id = users.id) as backed_projects_count,
                            (SELECT 	COUNT(*)
                             FROM   	user_team,
                                      projects
                             WHERE  	user_team.user_id = users.id
                             AND      projects.team_id = user_team.team_id) as created_project_count,
                            users.facebook_url,
                            users.twitter_url,
                            users.instagram_url,
                            users.google_plus_url,
                            users.is_stripe_connected,
                            CASE WHEN exists(SELECT 1
                                             FROM   social_auths
                                             WHERE  social_auths.user_id = users.id) THEN true ELSE false END as social_authorized,
                            (SELECT	addresses.street_address
                             FROM		addresses
                             WHERE	addresses.user_id = users.id) as address,
                            (SELECT user_team.team_id
                             FROM   user_team
                             WHERE user_team.user_id = users.id
                             AND   user_team.representative = 1) as team_id
                    FROM		users, 
                            roles
                    WHERE 	users.id = ?
                    AND   	users.role_id = roles.id
                    `, [userInfo.id], 
    function(error, results, fields){
      if (error) throw error;
      user = results[0];
      if(user.role_name == 'admin'){
        connection.query(`SELECT	projects.id,
                                  projects.title,
                                  projects.video_url,
                                  projects.pledged_amount,
                                  projects.funded_amount,
                                  ROUND((projects.funded_amount/projects.pledged_amount)*100) as percent_funded,
                                  projects.end_date,
                                  projects.funding_model,
                                  projects.start_date,
                                  projects.duration,
                                  projects.category_id,
                                  categories.name as category_name,
                                  team.name as team_name,
                                  projects.total_backers,
                                  null as image_url,
                                  projects.currency,
                                  stories.body as story,
                                  true as can_edit,
                                  projects.aasm_state as current_state,
                                  CASE WHEN (projects.pledged_amount - projects.funded_amount) <= 0 THEN true ELSE false END as is_funded
                          FROM 		projects
                          INNER JOIN	categories ON categories.id = projects.category_id
                          INNER JOIN	team ON team.id = projects.team_id
                          LEFT JOIN	stories ON stories.project_id = projects.id`, 
          function(error, results, fields){
            connection.end();
            if(error) throw error;
            user.projects = results;
            res
              .status(200)
              .json({
                user
              })
            res.end();

            }
          ) //Fin obtener proyectos.
      }else{
        connection.query(`SELECT	projects.id,
                                  projects.title,
                                  projects.video_url,
                                  projects.pledged_amount,
                                  projects.funded_amount,
                                  ROUND((projects.funded_amount/projects.pledged_amount)*100) as percent_funded,
                                  projects.end_date,
                                  projects.funding_model,
                                  projects.start_date,
                                  projects.duration,
                                  projects.category_id,
                                  categories.name as category_name,
                                  team.name as team_name,
                                  projects.total_backers,
                                  null as image_url,
                                  projects.currency,
                                  stories.body as story,
                                  true as can_edit,
                                  projects.aasm_state as current_state,
                                  CASE WHEN (projects.pledged_amount - projects.funded_amount) <= 0 THEN true ELSE false END as is_funded
                          FROM 		projects,
                                  categories,
                                  team,
                                  stories
                          WHERE   projects.team_id = ?
                          AND		  categories.id = projects.category_id
                          AND		  team.id = projects.team_id
                          AND		  stories.project_id = projects.id`, user.team_id, 
          function(error, results, fields){
            connection.end();
            if(error) throw error;
            user.projects = results;
            res
              .status(200)
              .json({
                user
              })
             res.end();

            }
         ) //Fin obtener proyectos.
      } 
    
	}); //Fin obtener usuario.
}

exports.createTeam = function(req, res){
  let team = req.body.team;
  let teamResult;
  createConnection();
  if(team.id == ''){
    connection.query('SELECT * FROM team WHERE UPPER(name) = ?', [(team.name).toUpperCase()], function(error, results, fields){
      connection.end();
      if(error) throw error;
      teamResult = results[0];
      if(teamResult){
        //Ya existe el nombre del equipo.
        res
          .status(200)
          .json({
            status: false,
            error:  "Team Ya Existe."	
          })
        res.end();
      }else{
        //Crear nuevo Team.
        var now = new Date();
        let url;
          if(team.images_data){
            for(let i of team.images_data){
              cloudify.upload_image(i, function(data){
                if(!data.error){
                  url = data.url;
                }
              });
            }
          }

          let teamJson = {
            name: team.name,
            logo_url : url,
            description: team.description,
            team_date: dateFormat(team.start_date),
            created_at: dateFormat(now, "isoDateTime"),
            updated_at: dateFormat(now, "isoDateTime")
          };

          connection.query('INSERT INTO team SET ?', teamJson, function(error, results, fields){
            connection.end();
            if(error) throw error;
            
          }); //Fin Insert
          res
          .status(200)
          .json({
            status: true	
          })
        res.end();
      }
    });

   
  }else{
    var now = new Date();
    connection.query('UPDATE team SET updated_at = ?, name = ?, description = ?, WHERE id = ?' 
      [dateFormat(now, "isoDateTime"), 
      team.name,
      team.description, 
      storySave.id]);
    connection.end();
      res
      .status(200)
      .json({
        status: true
      })
    res.end();
  }

	return;
}

exports.getTeams = function(req, res){
  let teams;
  createConnection();
  connection.query(`SELECT	id,
                            name
                    FROM		team`, 
    function(error, results, fields){
      connection.end();
      if (error) throw error;
      teams = results;
      res
        .status(200)
        .json({
          teams: teams
        })
      res.end();
	}); //Fin obtener usuario.
}

createConnection = function(){
	connection = mysql.createConnection(db.db_credentials);
}