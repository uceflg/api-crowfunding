//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var dbconfig = require('../config/dbAUth');
var randtoken = require('rand-token') 

var db_config = {
    host     : 'otaratest.clnu8soa3vtl.us-east-2.rds.amazonaws.com',
    user     : 'otara',
    password : 'megazero123',
    database : 'otaradb'
};
var connection;

exports.draft = function(req, res){
    
}