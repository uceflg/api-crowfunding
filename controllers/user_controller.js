//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var db = require('../config/db');
var connection = mysql.createConnection(db.db_credentials);

exports.fetchUser = function(req, res){
  let userInfo = req.params;
  console.log(userInfo);
  let user;
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
                             FROM   	projects
                             WHERE  	projects.user_id = users.id) as created_project_count,
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
                             WHERE	addresses.user_id = users.id) as address
                    FROM		users, 
                            roles 
                    WHERE 	users.id = ?
                    AND   	users.role_id = roles.id`, [userInfo.id], 
    function(error, results, fields){
      if (error) throw error;
      user = results[0];
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
                                users.name as user_name,
                                projects.total_backers,
                                users.image_url,
                                projects.currency,
                                stories.body as story,
                                true as can_edit,
                                projects.aasm_state as current_state,
                                CASE WHEN (projects.pledged_amount - projects.funded_amount) <= 0 THEN true ELSE false END as is_funded
                        FROM 		projects,
                                categories,
                                users,
                                stories
                        WHERE   projects.user_id = ?
                        AND		  categories.id = projects.category_id
                        AND		  users.id = projects.user_id
                        AND		  stories.project_id = projects.id`, user.id, 
        function(error, results, fields){
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
    
	}); //Fin obtener usuario.
}