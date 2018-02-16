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
    connection.query(`SELECT	users.email
                      FROM 		user_team,
                              users
                      WHERE  	user_team.team_id = ?
                      AND 		users.id = user_team.user_id
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
  let memberInfo = req.body;
  let member;
  pool.getConnection(function(error, connection){
    connection.query(`SELECT	*
                      FROM    user
                      WHERE   user.email = ?
                      `,
                      [memberInfo.email], 
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