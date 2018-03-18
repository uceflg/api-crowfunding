//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var db = require('../config/db');
var cloudify = require('./image_uploader');
var pool = mysql.createPool(db.db_credentials);

exports.fetchUser = function(req, res){
  fetchUser(req, res);
}

exports.updateProfilePic = function(req, res){
  let id = req.params.id;
  let image_data = req.body.image_data;
  if(image_data){
    cloudify.upload_image(image_data, function(data){
      if(!data.error){
        pool.getConnection(function(error, connection){
          var now = new Date();
          connection.query(`UPDATE users SET image_url = ?, updated_at = ? WHERE id = ? `, [data.url, dateFormat(now, "isoDateTime"), id], function(error, results, fields){
            if(error) throw error;
            connection.release();
            fetchUser(req, res);
          })
        });
      }
      else{
        fetchUser(req, res);
      }
    });
  }else{
    console.log("no entre");
  }
}

exports.updateUser = function(req, res){
  let userId = req.params.id;
  let newData = req.body.user;
  var now = new Date();
  console.log(newData);
  if(newData.address_attributes.id == null){
    pool.getConnection(function(error, connection){
      connection.query(`INSERT INTO addresses
                               (street_address,
                                city,
                                postcode,
                                country,
                                user_id,
                                created_at,
                                updated_at)
                        VALUES  (?,?,?,?,?,?,?)
                                `,
        [newData.address_attributes.street_address, 
         newData.address_attributes.city,
         newData.address_attributes.postcode,
         newData.address_attributes.country,
         userId,
         dateFormat(now, "isoDateTime"),
         dateFormat(now, "isoDateTime")],
        function(error, results, fields){
          if (error) throw error;
          connection.query(`UPDATE users SET name = ?, phone_no = ?, updated_at = ? WHERE id = ?`, 
            [newData.name, newData.phone_no, dateFormat(now, "isoDateTime"), userId], 
            function(error, results, fields){
            connection.release();
            fetchUser(req, res);
          });          
      }); //Fin obtener usuario.
    });
  }else{
    pool.getConnection(function(error, connection){
      connection.query(`UPDATE  addresses
                        SET     street_address = ?,
                                city = ?,
                                postcode = ?,
                                country = ?,
                                updated_at = ?
                        WHERE   id = ?
                        AND     user_id = ?
                                `,
        [newData.address_attributes.street_address, 
         newData.address_attributes.city,
         newData.address_attributes.postcode,
         newData.address_attributes.country,
         dateFormat(now, "isoDateTime"),
         newData.address_attributes.id,
         userId],
        function(error, results, fields){
          if (error) throw error;
          connection.query(`UPDATE users SET name = ?, phone_no = ?, updated_at = ? WHERE id = ?`, 
            [newData.name, newData.phone_no, dateFormat(now, "isoDateTime"), userId], 
            function(error, results, fields){
            connection.release();
            fetchUser(req, res);
          });          
      }); //Fin obtener usuario.
    });
  }
  // if(newData.password != ''){
  //   var salt =  crypto.randomBytes(16).toString('hex');
  //   var hash =  crypto.pbkdf2Sync(newData.password, salt, 1000, 64, 'sha512').toString('hex');
    
  // }else{
  //   console.log(newData);
  //   let teams;
  //   pool.getConnection(function(error, connection){
  //     connection.query(`UPDATE  user
  //                       SET     email = ?,
  //                               secondary_email = ?,
  //                       WHERE   id = ?`,
  //       [newData.email, newData.secondary_email,  userId],
  //       function(error, results, fields){
  //         connection.release();
  //         if (error) throw error;
  //         teams = results;
  //         res
  //           .status(200)
  //           .json({
  //             teams: teams
  //           })
  //         res.end();
  //         return;
  //     });
  //   });
  // }
}

exports.fetchAllUsers = function(req, res){
  let users;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT 	users.id,
                              users.name
                      FROM		users,
                              roles
                      WHERE		NOT EXISTS (SELECT	1
                                          FROM	  user_team
                                          WHERE		user_team.user_id = users.id
                                          AND     user_team.leader = 1)
                      AND		roles.id = users.role_id
                      AND		roles.name <> 'admin'`, 
      function(error, results, fields){
        connection.release();
        if (error) throw error;
        users = results;
        res
          .status(200)
          .json({
            users: users
          })
        res.end();
        return;
    }); //Fin obtener usuario.
  });
}

exports.createTeam = function(req, res){
  let team = req.body.team;
  let teamResult;
  pool.getConnection(function(error, connection){
    if(team.id == ''){
      connection.query('SELECT * FROM team WHERE UPPER(name) = ?', [(team.name).toUpperCase()], function(error, results, fields){
        if(error) throw error;
        teamResult = results[0];
        if(teamResult){
          connection.release();
          //Ya existe el nombre del equipo.
          res
            .status(200)
            .json({
              status: false,
              error:  "Team Ya Existe."	
            })
          res.end();
          return;
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
              email: team.email,
              web_url: team.web_url,
              city: team.city,
              state: team.state,
              region: team.region,
              description: team.description,
              team_date: dateFormat(team.start_date),
              created_at: dateFormat(now, "isoDateTime"),
              updated_at: dateFormat(now, "isoDateTime")
            };
            console.log(team.representative)

            connection.query('INSERT INTO team SET ?', teamJson, function(error, results, fields){
              if(error) throw error;
              let newTeam;
              let existe;
              connection.query('SELECT * FROM team WHERE UPPER(name) = ?',[(team.name).toUpperCase()], function(error, results, fields){
                if(error) throw error;
                newTeam = results[0];
                console.log("team",newTeam);
                connection.query('SELECT * FROM user_team WHERE user_id = ?',[team.representative], function(error, results, fields){
                  if(error) throw error;
                  existe = results[0];
                  console.log("existe",results[0]);
                  if(existe){
                    connection.query('UPDATE user_team SET leader = 1, editor = 1 WHERE user_id = ?',[team.representative]);
                  }else{
                    connection.query('INSERT INTO user_team(user_id, team_id, leader, editor) VALUES(?, ?, ?, ?)',[team.representative, newTeam.id, true, true]);
                  }
                  connection.release();
                  res
                    .status(200)
                    .json({
                      status: true	
                    })
                  res.end();
                  return;
                });
              });
              
            }); //Fin Insert  
        }
      });

    
    }else{
      var now = new Date();
      connection.query('UPDATE team SET updated_at = ?, name = ?, description = ?, WHERE id = ?' 
        [dateFormat(now, "isoDateTime"), 
        team.name,
        team.description, 
        team.id]);
        let existe;
        let quitar;
        connection.query('SELECT * FROM user_team WHERE user_id = ?',[team.representative], function(error, results, fields){
          if(error) throw error;
          existe = results[0];
          if(existe){
            connection.query('UPDATE user_team SET leader = 1, editor = 1 WHERE user_id = ? AND team_id = ?',[team.representative, team.id]);
            connection.query('SELECT * FROM user_team WHERE user_id <> ? AND team_id = ?', [team.representative, team.id], function(error, results, fields){
              if(error) throw error;
              quitar = results[0];
              if(quitar){
                connection.query('UPDATE user_team SET leader = 0, editor = 0 WHERE user_id = ? AND team_id = ?', [quitar.id, team.id]);
              }
            });
          }else{
            connection.query('INSERT INTO user_team(user_id, team_id, leader, editor) VALUES(?, ?, ?, ?)',[team.representative, team.id, true, true]);
            connection.query('SELECT * FROM user_team WHERE user_id <> ? AND team_id = ?', [team.representative, team.id], function(error, results, fields){
              if(error) throw error;
              quitar = results[0];
              if(quitar){
                connection.query('UPDATE user_team SET leader = 0, editor = 0 WHERE user_id = ? AND team_id = ?', [quitar.id, team.id]);
              }
            });
          }
          connection.release();
          res
          .status(200)
          .json({
            status: true
          })
        res.end();
        });

     
    }

    return;
  });
}

exports.getTeams = function(req, res){
  let teams;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT	id,
                              name
                      FROM		team`, 
      function(error, results, fields){
        connection.release();
        if (error) throw error;
        teams = results;
        res
          .status(200)
          .json({
            teams: teams
          })
        res.end();
        return;
    }); //Fin obtener usuario.
  });
} 

fetchUser = function(req, res){
  let userInfo = req.params;
  let user;
  pool.getConnection(function(error, connection){
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
                              IFNULL((SELECT user_team.team_id
                              FROM   user_team
                              WHERE user_team.user_id = users.id),0) as team_id,
                              CASE WHEN EXISTS(SELECT 1
                                               FROM   user_team
                                               WHERE user_team.user_id = users.id
                                                AND   user_team.leader = 1) THEN true ELSE false END leader,
                              CASE WHEN EXISTS(SELECT 1
                                               FROM   user_team
                                               WHERE user_team.user_id = users.id
                                               AND   user_team.editor = 1) THEN true ELSE false END can_edit
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
              if(error) throw error;
              user.projects = results;
              connection.query(`SELECT  id,
                                        street_address,
                                        city,
                                        postcode,
                                        country
                                FROM    addresses
                                WHERE   user_id = ?`,
                [userInfo.id],
                function(error,results, fields){
                  connection.release();
                  if(error) throw error;
                  user.address = results[0];
                  res
                    .status(200)
                    .json({
                      user
                    })
                  res.end();
                  return;
                });
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
              if(error) throw error;
              user.projects = results;
              connection.query(`SELECT  id,
                                        street_address,
                                        city,
                                        postcode,
                                        country
                                FROM    addresses
                                WHERE   user_id = ?`,
                [userInfo.id],
                function(error, results, fields){
                  connection.release();
                  if(error) throw error;
                  user.address = results[0];
                  res
                    .status(200)
                    .json({
                      user
                    })
                  res.end();
                  return;
                });
              }
          ) //Fin obtener proyectos.
        }      
    }); //Fin obtener usuario.
  });
}