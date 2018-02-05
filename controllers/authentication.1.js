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

var refreshTokens = {};



module.exports.register = function (req, res) {

    connection = mysql.createConnection(db_config);

    var name = req.body.user.name;
    var email = req.body.user.email;
    var stringi = JSON.stringify(req.body.user.password);
    
    var pass = stringi;
    connection.connect(function(err){
        if(!err) {
            console.log("Database is connected ... nn");    
        } else {
            console.log("Error connecting database ... nn");    
        }
        });
    

    connection.query("SELECT * FROM users WHERE name = ?", [name], function (err, rows, fields) {
        
        if (err){
            connection.end();
            console.log('Error while performing Query.');
            res.status(404).send('Error while performing Query.');
            res.end();
        }
        if (rows.length) {
            connection.end();
            console.log('no encontre ni shiet');
            res.status(404).send('signupMessage That username is already taken.');
            res.end();
        } else {
            console.log("entre");
            // if there is no user with that username
            // create the user
            var d = new Date();
            var x = new Date().getTimezoneOffset();
            var n = d - x;
            var h = new Date(d.getTime() - x * 60 * 1000);
            var salt =  crypto.randomBytes(16).toString('hex');
            var hash =  crypto.pbkdf2Sync(pass, salt, 1000, 64, 'sha512').toString('hex');
            
            var newUserMysql = {
                name: name,
                email: email,
                salt: salt,  // use the generateHash function in our user model
                hash: hash,
                created_at: dateFormat(h, "isoDateTime"),
                updated_at: dateFormat(h, "isoDateTime")
            };
            console.log(newUserMysql.salt);
            console.log(newUserMysql.hash);

            var insertQuery = "INSERT INTO users ( name, email, hash, salt, created_at, updated_at) values (?,?,?,?,?,?)";

            connection.query(insertQuery, [newUserMysql.name, newUserMysql.email, newUserMysql.hash, newUserMysql.salt, newUserMysql.created_at, newUserMysql.updated_at], function (err, rows) {
                if (err) {
                    connection.end();
                    console.log('no se que wea');
                    res.status(404).send(err);
                    res.end();
                }
                var token;
                console.log(rows.insertId);
                //token = generateJwt();
                res.sendStatus(200).send(newUserMysql.id);
                connection.end();
                /*res.json({
                    "token": token,
                    "newUserMysql": newUserMysql.id
                });*/
            });
        }
    });

};

module.exports.login = function (req, res) {
    var email = req.body.credentials.email;
    var stringi = JSON.stringify(req.body.credentials.password);
    
    var pass = stringi;

    connection = mysql.createConnection(db_config);

    connection.connect(function(err){
        if(!err) {
            console.log("Database is connected ... nn");    
        } else {
            console.log("Error connecting database ... nn");    
        }
        });    

    connection.query("SELECT * FROM users WHERE email = ?", [email], function (err, rows, fields) {
        
        if (err){
            connection.end();
            console.log('Error while performing Query.');
            res.status(404).send('Error while performing Query.');
            res.end();
        }
        if (rows.length) {
            if(validPassword(pass, rows[0].salt, rows[0].hash)){
                connection.end();
                const payload = {
                    user: rows[0].id
                };
                var token = jwt.sign(payload, 'superSecret', {
                     expiresIn: "24h" // expires in 24 hours
                 });
                 var refreshToken = randtoken.uid(256);
                 refreshTokens[refreshToken] = rows[0].id;
                 res.json({
                     success: true,
                     message: 'Connection Successful',
                     user: rows[0],
                     authorization: token,
                     refresh: refreshToken
                 });
                 res.end();
            }else{
                connection.end();
                console.log("error");
            }
        } else {
            connection.end();
            console.log('User doesn\'t exists');
            res.status(401).send('User doesn\'t exists');
            read.end();
        }
    });
};

module.exports.isLoggedIn = function (req, res) {
    let token = req.query['x-access-token'];
    jwt.verify(token, 'superSecret', function(err, decoded){
        if(err){
            res.status(401).send(err);
            res.end();
        }

        console.log(decoded.user);

        connection = mysql.createConnection(db_config);
        let insertQuery = "SELECT * FROM users WHERE id = ?"
        connection.query(insertQuery, [decoded.user], function (err, rows) {
            if (err) {
                connection.end();
                console.log('no se que wea');
                res.status(404).send(err);
                res.end();
            }
            res.status(200);
            res.json({
                success: true,
                message: 'Connection Successful',
                user: rows[0]
            });
            res.end();
        });

        
    });    
};

validPassword = function(password, salt, hash){
    var hashVerified = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hashVerified === hash;
};

generateJwt = function () {
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    return jwt.sign({
        _id: this._id,
        email: this.email,
        name: this.name,
        exp: parseInt(expiry.getTime() / 1000),
    }, process.env.SECRET); // DO NOT KEEP YOUR SECRET IN THE CODE!
};