//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var dbConfig = require('../config/db');
var authConfig = require('../config/auth_conf').auth;
var randtoken = require('rand-token') 
const nodemailer = require('nodemailer');

var connection;

var refreshTokens = {};



module.exports.register = function (req, res) {

    connection = mysql.createConnection(dbConfig.db_credentials);

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
    

    connection.query("SELECT * FROM users WHERE email = ?", [email], function (err, rows, fields) {
        
        if (err){
            connection.end();
            console.log('Error while performing Query.');
            res.status(404).send('Error while performing Query.');
            res.end();
            return;
        }
        if (rows.length) {
            connection.end();
            res.status(404).json({message: "El correo ya se encuentra utilizado."});
            res.end();
            return;
        } else {
            // if there is no user with that username
            // create the user
            var d = new Date();
            var x = new Date().getTimezoneOffset();
            var n = d - x;
            var h = new Date(d.getTime() - x * 60 * 1000);
            var salt =  crypto.randomBytes(16).toString('hex');
            var hash =  crypto.pbkdf2Sync(pass, salt, 1000, 64, 'sha512').toString('hex');
            var confirm_token;
            //async email
            console.log(authConfig);
            jwt.sign(
                {
                    email: email
                }, 
                authConfig.mail_secret, 
                {
                    expiresIn: "24h" // expires in 24 hours
                },
                (err, emailToken) => {
                if(err) console.log(err);
                confirm_token = emailToken;
                const url = `http://localhost:4200/?confirm=${confirm_token}`
                // Generate test SMTP service account from ethereal.email
                // Only needed if you don't have a real mail account for testing
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: authConfig.user_email, // generated ethereal user
                        pass: authConfig.pass_email // generated ethereal password
                    }
                });

                // setup email data with unicode symbols
                let mailOptions = {
                    from: '"Usqai 🌟" <foo@example.com>', // sender address
                    to: email, // list of receivers
                    subject: 'Confirmar cuenta "Emprendo por mi Region" ✔', // Subject line
                    html: `
                    <div style="background-color:#fff;margin:0 auto 0 auto;padding:30px 0 30px 0;color:#4f565d;font-size:13px;line-height:20px;font-family:'Helvetica Neue',Arial,sans-serif;text-align:left;">
                    <center>
                      <table style="width:550px;text-align:center">
                        <tbody>
                          <tr>
                            <td style="padding:0 0 20px 0;border-bottom:1px solid #e9edee;">
                              <a href="http://www.usqai.cl" style="display:block; margin:0 auto;" target="_blank">
                                <img src="http://i63.tinypic.com/219816u.png" width="500" height="90" alt="Usqai logo" style="border: 0px;">
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding:30px 0;">
                              <p style="color:#1d2227;line-height:28px;font-size:22px;margin:12px 10px 20px 10px;font-weight:400;">Hola ${name}, bienvenido a Emprendo por mi Region</p>
                              <p style="margin:0 10px 10px 10px;padding:0;">Nos gustaria asegurarnos que tenemos tu correo electronico correcto.</p>
                              <p>
                                <a style="display:inline-block;text-decoration:none;padding:15px 20px;background-color:#2baaed;border:1px solid #2baaed;border-radius:3px;color:#FFF;font-weight:bold;" href="${url}" target="_blank">Si, soy yo – Empecemos!</a>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding:30px 0 0 0;border-top:1px solid #e9edee;color:#9b9fa5">
                              If you have any questions you can contact us at <a style="color:#666d74;text-decoration:none;" href="mailto:support@xero.com" target="_blank">contacto@otara.cl</a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </center>
                  </div>` // html body
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message sent: %s', info.messageId);
                    // Preview only available when sending through an Ethereal account
                    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

                    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
                    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
                });

                var newUserMysql = {
                    name: name,
                    email: email,
                    salt: salt,  // use the generateHash function in our user model
                    hash: hash,
                    confirm_token: confirm_token,
                    role_id: 2,
                    created_at: dateFormat(h, "isoDateTime"),
                    updated_at: dateFormat(h, "isoDateTime")
                };
    
                var insertQuery = "INSERT INTO users ( name, email, hash, salt, confirm_token, role_id, created_at, updated_at) values (?,?,?,?,?,?,?)";
                
                connection.query(insertQuery, [newUserMysql.name, newUserMysql.email, newUserMysql.hash, newUserMysql.salt, newUserMysql.confirm_token, 2, newUserMysql.created_at, newUserMysql.updated_at], function (err, rows) {
                    if (err) {
                        connection.end();
                        res.status(404).send(err);
                        res.end();
                        return;
                    }
                    connection.end();
                    var token;
                    console.log(rows.insertId);
                    //token = generateJwt();
                    res
                        .status(200)
                        .json({
                            message: "A Confirmation email has bent sent to "+ email + ", please confirm it"
                        });
                    return;
                    /*res.json({
                        "token": token,
                        "newUserMysql": newUserMysql.id
                    });*/
                });
            });
        }
    });

};

module.exports.login = function (req, res) {
    var email = req.body.credentials.email;
    var stringi = JSON.stringify(req.body.credentials.password);
    
    var pass = stringi;

    connection = mysql.createConnection(dbConfig.db_credentials);

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
            return;
        }
        if (rows.length) {
            
            if(rows[0].email_confirmed == 0){
                connection.end();
                console.log('Email not confirmed.');
                res
                    .status(200)
                    .json({
                        error: true,
                        message: 'Email not confirmed.'
                    });
                res.end();
                return;
            }

            if(validPassword(pass, rows[0].salt, rows[0].hash)){
                connection.end();
                const payload = {
                    user: rows[0].id
                };
                var token = jwt.sign(payload, authConfig.jwt_secret, {
                     expiresIn: "24h" // expires in 24 hours
                 });
                 var refreshToken = randtoken.uid(256);
                 refreshTokens[refreshToken] = rows[0].id;
                 res.json({
                     success: true,
                     message: 'Connection Successful',
                     user: {id: rows[0].id, name: rows[0].name, image_url: rows[0].image_url, email: rows[0].email},
                     authorization: token,
                     refresh: refreshToken
                 });
                 res.end();
                 return;
            }else{
                connection.end();
                console.log("error");
                return;
            }
        } else {
            connection.end();
            console.log('User doesn\'t exists');
            res.status(401).send('User doesn\'t exists');
            res.end();
        }
    });
};

module.exports.isLoggedIn = function (req, res) {
    let token = req.query['x-access-token'];
    jwt.verify(token, authConfig.jwt_secret, function(err, decoded){
        if(err){
            res.status(401).send(err);
            res.end();
        }

        connection = mysql.createConnection(dbConfig.db_credentials);
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
            return;
        });

        
    });    
};

module.exports.confirmEmail = function(req, res){
    let token = req.body.token;
    jwt.verify(token, authConfig.mail_secret, function(err, decoded){
        if(err){
            res.status(200);
            res.json({
                message: 'El token a expirado.',
            });
            res.end();
            return;
        }
        console.log(decoded)
        connection = mysql.createConnection(dbConfig.db_credentials);
        connection.query(`SELECT confirm_token FROM user WHERE email = ?`, [decoded.email], function(err, rows){
            if (err) {
                connection.end();
                console.log('no se que wea');
                res.status(404).send(err);
                res.end();
                return;
            }
            let user_token = rows;
            if(usert_token == token){
                let insertQuery = "UPDATE users SET email_confirmed = 1 WHERE email = ?"
                connection.query(insertQuery, [decoded.email], function (err, rows) {
                    if (err) {
                        connection.end();
                        console.log('no se que wea');
                        res.status(404).send(err);
                        res.end();
                        return;
                    }
                    res.status(200);
                    res.json({
                        success: true,
                        message: 'Email confirmado con exito, ahora puede iniciar sesión.',
                    });
                    res.end();
                    return;
                });
            }else{
                res.status(200);
                res.json({
                    message: 'El Token no es correcto, debe solicitar un nuevo mail de confirmación',
                });
                res.end();
                return;
            }
        });
    });    
}

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