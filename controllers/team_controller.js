//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var db = require('../config/db');
var pool = mysql.createPool(db.db_credentials);

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

exports.getTeam = function(req, res){
  let teamInfo = req.params;
  let teams;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT	team.id,
                              team.name,
                              team.logo_url,
                              team.web_url,
                              team.email,
                              user_team.user_id as representative
                      FROM		team
                      LEFT JOIN user_team
                            ON  user_team.team_id = team.id
                            AND user_team.leader = 1
                      WHERE   team.id = ?
                      `,
                      [teamInfo.id], 
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

exports.getMembers = function(req, res){
  let teamId = req.params;
  console.log(teamId);
  let members;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT	users.email,
                              user_team.leader,
                              user_team.editor
                      FROM 		user_team,
                              users
                      WHERE  	user_team.team_id = ?
                      AND 		users.id = user_team.user_id
                      ORDER BY user_team.leader desc
                      `,
                      [teamId.id], 
      function(error, results, fields){
        connection.release();
        if (error) throw error;
        members = results;
        res
          .status(200)
          .json({
            members: members
          })
        res.end();
        return;
    }); //Fin obtener usuario.
  });
}

exports.setMember = function(req, res){
  let memberInfo = req.body.member;
  let member;
  let user;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT	*
                      FROM    users
                      WHERE   users.email = ?
                      `,
                      [memberInfo.email], 
      function(error, results, fields){
        if (error) throw error;
        user = results[0];
        if(user){ 
          if(memberInfo.editor == '1'){
            //Ver si el usuario existe como editor de otro team.
            connection.query(`SELECT * FROM user_team WHERE user_id = ? AND team_id <> ? AND (editor = 1 OR leader = 1)`, [user.id, memberInfo.team], function(error, rows, fields){
              if(error) throw error;
              member = rows[0]
              if(member){
                connection.release();
                res
                  .status(200)
                  .json({
                    error: 1,
                    message: "El usuario ya es editor de otro proyecto.."
                  })
                res.end();
                return;
              }else{
                //Ver si el usuario ya existe 
                connection.query(`SELECT * FROM user_team WHERE user_id = ? AND team_id = ?`, [user.id, memberInfo.team], function(error, rows, fields){
                  if(error) throw error;
                  member = rows[0]
                  if(member){
                    connection.query(`UPDATE user_team SET editor = ? WHERE user_id = ? AND team_id = ?`, [true, user.id, memberInfo.team], function(error, rows, fields){
                      res
                        .status(200)
                        .json({
                          message: "Se actualizaron los privilegios del usuario."
                        })
                      res.end();
                      return;
                    });
                  }else{
                    connection.query(`INSERT INTO user_team(user_id, team_id, leader, editor) SET(?,?,?,?)`, [user.id, memberInfo.team, false, true], function(error, rows, fields){
                      res
                        .status(200)
                        .json({
                          message: "Se agrego el usuario al team."
                        })
                      res.end();
                      return;
                    });
                  }
                });
              }
            });
          }else{
            //No es editor pero se verifica el usuario igual.
            //Ver si el usuario ya existe 
            connection.query(`SELECT * FROM user_team WHERE user_id = ? AND team_id = ?`, [user.id, memberInfo.team], function(error, rows, fields){
              if(error) throw error;
              member = rows[0]
              if(member){
                connection.query(`UPDATE user_team SET editor = ? WHERE user_id = ? AND team_id = ?`, [false, user.id, memberInfo.team], function(error, rows, fields){
                  res
                    .status(200)
                    .json({
                      message: "Se actualizaron los privilegios del usuario."
                    })
                  res.end();
                  return;
                });
              }else{
                let memberJson = {
                  user_id: user.id,
                  team_id: memberInfo.team,
                  leader: false,
                  editor: false
                }
                connection.query(`INSERT INTO user_team SET ?`, [memberJson], function(error, rows, fields){
                  res
                    .status(200)
                    .json({
                      message: "Se agrego el usuario al team."
                    })
                  res.end();
                  return;
                });
              }
            });
          }
          
        }else{
          //No se encontro usuario.
          connection.release();
          res
            .status(200)
            .json({
              error: 1,
              message: "El Correo no se encuentra registrado."
            })
          res.end();
          return;
        }
    }); //Fin obtener usuario.
  });
}

exports.deleteMember = function(req, res){
  let memberInfo = req.body.member;
  let member;
  let user;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT	*
                      FROM    users
                      WHERE   users.email = ?
                      `,
                      [memberInfo.email], 
      function(error, results, fields){
        if (error) throw error;
        user = results[0];
        if(user){
          connection.query(`SELECT  *
                            FROM    user_team
                            WHERE   user_id = ?
                            AND     team_id = ?`, [user.id, memberInfo.team], function(error, results, fields){
            if(error){
              throw error;
            }
            member = results[0];
            if(member.leader == 1){
              connection.release();
              res
                .status(200)
                .json({
                  error: 1,
                  message: "No se pude eliminar al lider del team."
                })
              res.end();
              return;
            }else{
              connection.query(`DELETE FROM user_team
                            WHERE  user_id = ?
                            AND    team_id = ?`, [user.id, memberInfo.team], function(error, results, fields){
                connection.release();
                res
                  .status(200)
                  .json({
                    message: "Se elimino al usuario del team correctamente."
                  })
                res.end();
                return;
              });
            }
          });
        }else{
          connection.release();
          res
            .status(200)
            .json({
              error: 1,
              message: "No se pudo eliminar al usuario del team."
            })
          res.end();
          return;
        }
        
    }); //Fin obtener usuario.
  });
}