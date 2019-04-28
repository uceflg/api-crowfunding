//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var db = require('../config/db');
var cloudify = require('./image_uploader');
var authConfig = require('../config/auth_conf').auth;
var dbConfig = require('../config/db');

const Pool = require('pg').Pool
const pool = new Pool(dbConfig.db_credentials);

exports.fetchUser = function (req, res) {
  fetchUser(req, res);
}



exports.getPosibleLeaders = function (req, res) {
  let token = req.headers.auth;
  if (!token) {
    return res.status(202).send({ err: "TOKEN_ERROR: No valid token" })
  };
  jwt.verify(token, authConfig.jwt_secret, function (err, decoded) {
    if (err) {
      res.status(204).send(err);
      res.end();
    }

    let insertQuery = `SELECT array_agg(users.email) as emails
                        FROM	users
                        WHERE	NOT EXISTS(SELECT	1
                                          FROM	user_role
                                          INNER JOIN roles
                                            ON	roles.id = user_role.role_id
                                            AND	roles.role_name = 'admin'
                                          WHERE	user_role.user_id = users.id)`;
    pool.query(insertQuery)
      .then(result => {
        let user = result.rows[0];
        res.status(200);
        res.json({
          success: true,
          message: 'Connection Successful',
          candidates: user
        });
        res.end();
        return;
      })
      .catch(e => setImmediate(() => {
        console.log(e);
        res.status(404).send(e);
        res.end();
      }));
  });
}

exports.updateProfilePic = function (req, res) {
  let id = req.params.id;
  let image_data = req.body.image_data;
  if (image_data) {
    cloudify.upload_image(image_data, function (data) {
      if (!data.error) {
        pool.getConnection(function (error, connection) {
          var now = new Date();
          connection.query(`UPDATE users SET image_url = ?, updated_at = ? WHERE id = ? `, [data.url, dateFormat(now, "isoDateTime"), id], function (error, results, fields) {
            if (error) {
              connection.release();
              res
                .status(401)
              res.end();
              return;
            }
            connection.release();
            fetchUser(req, res);
          })
        });
      }
      else {
        fetchUser(req, res);
      }
    });
  } else {
    console.log("no entre");
  }
}

exports.updateUser = function (req, res) {
  let userId = req.params.id;
  let newData = req.body.user;
  var now = new Date();
  console.log(newData);

  return;
  if (newData.address_attributes.id == null) {
    pool.getConnection(function (error, connection) {
      connection.query(`INSERT INTO addresses
                               (address_1,
                                address_2,
                                city,
                                zip,
                                country,
                                user_id,
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
        function (error, results, fields) {
          if (error) {
            connection.release();
            res
              .status(401)
            res.end();
            return;
          }
          connection.query(`UPDATE users SET name = ?, phone_no = ?, updated_at = ? WHERE id = ?`,
            [newData.name, newData.phone_no, dateFormat(now, "isoDateTime"), userId],
            function (error, results, fields) {
              connection.release();
              fetchUser(req, res);
            });
        }); //Fin obtener usuario.
    });
  } else {
    pool.getConnection(function (error, connection) {
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
        function (error, results, fields) {
          if (error) {
            connection.release();
            res
              .status(401)
            res.end();
            return;
          }
          connection.query(`UPDATE users SET name = ?, phone_no = ?, updated_at = ? WHERE id = ?`,
            [newData.name, newData.phone_no, dateFormat(now, "isoDateTime"), userId],
            function (error, results, fields) {
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

exports.fetchAllUsers = function (req, res) {
  let users;
  pool.getConnection(function (error, connection) {
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
      function (error, results, fields) {
        connection.release();
        if (error) {
          res
            .status(401)
          res.end();
          return;
        }
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

exports.createTeam = function (req, res) {
  let query = `select f_create_team($1, $2)`;
  pool.query(query, [res.locals.id, JSON.stringify(req.body.team)])
    .then(result => {
      console.log(result);
      let user = result.rows[0];
      res.status(200);
      res.json({
        success: true,
        message: 'Connection Successful',
        candidates: user
      });
      res.end();
      return;
    })
    .catch(e => setImmediate(() => {
      res.status(404).send(e);
      res.end();
      return;
    }));

};

exports.getTeams = function (req, res) {
  let teams;
  pool.getConnection(function (error, connection) {
    connection.query(`SELECT	id,
                              name
                      FROM		team`,
      function (error, results, fields) {
        connection.release();
        if (error) {
          res
            .status(401)
          res.end();
          return;
        }
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

fetchUser = function (req, res) {
  let userInfo = req.params;
  let user;
  pool.getConnection(function (error, connection) {
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
      function (error, results, fields) {
        if (error) {
          connection.release();
          res
            .status(401)
          res.end();
          return;
        }
        user = results[0];
        if (user.role_name == 'admin') {
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
            function (error, results, fields) {
              if (error) {
                connection.release();
                res
                  .status(401)
                res.end();
                return;
              }
              user.projects = results;
              connection.query(`SELECT  id,
                                        street_address,
                                        city,
                                        postcode,
                                        country
                                FROM    addresses
                                WHERE   user_id = ?`,
                [userInfo.id],
                function (error, results, fields) {
                  connection.release();
                  if (error) {
                    res
                      .status(401)
                    res.end();
                    return;
                  }
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
        } else {
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
            function (error, results, fields) {
              if (error) {
                connection.release();
                res
                  .status(401)
                res.end();
                return;
              }
              user.projects = results;
              connection.query(`SELECT  id,
                                        street_address,
                                        city,
                                        postcode,
                                        country
                                FROM    addresses
                                WHERE   user_id = ?`,
                [userInfo.id],
                function (error, results, fields) {
                  connection.release();
                  if (error) {
                    res
                      .status(401)
                    res.end();
                    return;
                  }
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