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
                                  name,
                                  phone_no,
                                  email,
                                  amount,
                                  date)
                          VALUES  (?,?,?,?,?,?)
                                  `,
          [null,
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