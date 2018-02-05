//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var randtoken = require('rand-token') 
var Categories = require('../models/categories');
var db = require('../config/db');
var connection = mysql.createConnection(db.db_credentials);

exports.getAll = function(req, res){
    //let user = req.headers.user;
    let categories;
    connection.query('SELECT id, name FROM `categories`', function(error, results, fields){
		if (error) throw error;
        categories = results;
        console.log(categories);
        res.status(200).json({
            categories
        });
        res.end()
    });    
    return;
}