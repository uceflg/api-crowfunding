var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var db = require('../config/db');
var cloudify = require('./image_uploader');
var pool = mysql.createPool(db.db_credentials);

 exports.insertContribution = function(req, res){

    let newData = req.body;
    var now = new Date();
    console.log("mis datos")
    console.log(newData.nombre);
        pool.getConnection(function(error, connection){
            connection.query(`INSERT INTO contributes
                                    (user_id,
                                  project_id,  
                                  name,
                                  phone_no,
                                  email,
                                  amount,
                                  date)
                          VALUES  (?,?,?,?,?,?,?)
                                  `,
          [null,
           newData.proyecto,
           newData.nombre, 
           newData.telefono,
           newData.correo,
           newData.aporte,
           dateFormat(now, "isoDateTime")],
                function(error, results, fields){
                    if (error){
                        console.log("error")
                        connection.release();
                        res
                        .status(401)
                        res.end();
                    return;
                }
                res.status(200).json({
                });
                res.end();
            }); //Fin obtener usuario.
        });
}

exports.getBackers = function(req, res){
	let project;
	let project_id = req.params.id;
	pool.getConnection(function(error, connection){
		connection.query(`SELECT    name as Nombre,
                                    phone_no as Telefono,
                                    email as Email,
                                    amount as Monto
                          FROM  contributes
                          WHERE project_id = ?`,
							[project_id], 
		function(error, results, fields){
			connection.release();
			if (error){
				res
					.status(401)
				res.end();
				return;
			}
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

exports.getAllBackers = function(req, res){
	let project;
	pool.getConnection(function(error, connection){
		connection.query(`SELECT    name,
                                    phone_no,
                                    email,
                                    amount
                          FROM  contributes`,
		function(error, results, fields){
			connection.release();
			if (error){
				res
					.status(401)
				res.end();
				return;
			}
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