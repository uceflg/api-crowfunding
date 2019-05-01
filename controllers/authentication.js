//var LocalStrategy = require('passport-local').Strategy;

var mysql = require('mysql');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var dateFormat = require('dateformat');
var dbConfig = require('../config/db');
var authConfig = require('../config/auth_conf').auth;
var randtoken = require('rand-token')
const nodemailer = require('nodemailer');
const Pool = require('pg').Pool
const pool = new Pool(dbConfig.db_credentials);
var connection;

var refreshTokens = {};


module.exports.test = function (req, res) {
	console.log("hola");
	pool.query('SELECT NOW()', (err, query) => {
		if (err) {
			res.status(404).send(err); res.end();
		}
		console.log(query.rows)

		return;
		;

	});
}

module.exports.register = function (req, res) {

	var name = req.body.user.name;
	var email = req.body.user.email;
	let email_name = email
		.substring(0, email.indexOf('@'))
		.toLowerCase()
		.replace(/\./g, '');
	let email_domain = email.substring(email.indexOf('@'));
	let compare_email = email_name + email_domain;
	var stringi = JSON.stringify(req.body.user.password);
	var pass = stringi;
	pool.query(`SELECT	* 
								FROM 	users 
								WHERE CONCAT(
												REPLACE(SUBSTRING(email,1,strpos(email,'@') - 1), '.', ''),
												SUBSTRING(email,strpos(email,'@'))
												) = $1`, [compare_email], (err, query) => {
			if (err) {

				console.log('Error while performing Query.');
				res.status(404).json({ error: 'Error while performing Query.' });
				res.end();
				return;
			}
			console.log(query.rows);
			if (query.rows.length) {


				res.status(202).json({ err: "EMAIL_ERROR: El correo ya se encuentra utilizado." });
				res.end();
				return;
			} else {
				console.log(query.rows.length);
				// if there is no user with that username
				// create the user
				var d = new Date();
				var x = new Date().getTimezoneOffset();
				var n = d - x;
				var h = new Date(d.getTime() - x * 60 * 1000);
				var salt = crypto.randomBytes(16).toString('hex');
				var hash = crypto.pbkdf2Sync(pass, salt, 1000, 64, 'sha512').toString('hex');
				var confirm_token;
				//async email
				//console.log(authConfig);
				confirm_token = jwt.sign({ email: email }, authConfig.mail_secret, { expiresIn: "24h" });
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
							  Si tienes cualquier pregunta tu puedes contactarte con nosotros a <a style="color:#666d74;text-decoration:none;" href="mailto:support@xero.com" target="_blank">usqai@ucn.cl</a>
							</td>
						  </tr>
						</tbody>
					  </table>
					</center>
				  </div>` // html body
				};

				/*// send mail with defined transport object
				transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
						return console.log(error);
					}
					console.log('Message sent: %s', info.messageId);
					// Preview only available when sending through an Ethereal account
					console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
	
					// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
					// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
				});*/

				var newUserMysql = {
					name: name,
					email: email,
					salt: salt,  // use the generateHash function in our user model
					hash: hash,
					confirm_token: confirm_token,
					created_at: dateFormat(h, "isoDateTime"),
					updated_at: dateFormat(h, "isoDateTime"),
					email_confirmed: 1
				};

				var insertQuery = "select f_create_user($1) as response";
				pool.query(insertQuery, [newUserMysql])
					.then(result => {
						
						let user = result.rows[0];
						res.status(200);
						res.json({
							success: true,
							message: "Se ha registrado correctamente."
						});
						res.end();
						return;
					})
					.catch(e => setImmediate(() => {
						console.log(e);
						res.status(404).send(e);
						res.end();
						return;
					}));
			}
		});
};

module.exports.login = function (req, res) {
	var email = req.body.credentials.payload.email;
	var stringi = JSON.stringify(req.body.credentials.payload.password);
	var pass = stringi;
	let email_name = email
		.substring(0, email.indexOf('@'))
		.toLowerCase()
		.replace(/\./g, '');
	let email_domain = email.substring(email.indexOf('@'));
	let compare_email = email_name + email_domain;

	pool.query(`SELECT	* 
											FROM 	users 
											WHERE CONCAT(
															REPLACE(SUBSTRING(email,1,strpos(email,'@') - 1), '.', ''),
															SUBSTRING(email,strpos(email,'@'))
															) = $1`, [compare_email], (err, query) => {


			if (err) {

				console.log('Error while performing Query.');
				res.status(404).send('Error while performing Query.');
				res.end();
				return;
			}
			if (query.rows.length) {

				if (query.rows[0].email_confirmed == 0) {

					console.log('Email not confirmed.');
					res
						.status(200)
						.json({
							error: true,
							message: 'Email no confirmado.'
						});
					res.end();
					return;
				}

				if (validPassword(pass, query.rows[0].salt, query.rows[0].hash)) {

					const payload = {
						user: query.rows[0].id
					};
					var token = jwt.sign(payload, authConfig.jwt_secret, {
						expiresIn: "24h" // expires in 24 hours
					});
					var refreshToken = randtoken.uid(256);
					refreshTokens[refreshToken] = query.rows[0].id;
					res.json({
						success: true,
						message: 'Connection Successful',
						user: { first_name: query.rows[0].first_name, last_name: query.rows[0].last_name, image_url: query.rows[0].image_url, email: query.rows[0].email },
						authorization: token,
						refresh: refreshToken
					});
					res.end();
					return;
				} else {

					console.log("error");
					return;
				}
			} else {

				console.log('User doesn\'t exists');
				res.status(401).send('User doesn\'t exists');
				res.end();
			}
		});
};

module.exports.isLoggedIn = function (req, res) {
	let token = req.headers.auth;
	if (!token) return res.status(202).send({ err: "TOKEN_ERROR: No valid token" });
	jwt.verify(token, authConfig.jwt_secret, function (err, decoded) {
		if (err) {
			res.status(204).send(err);
			res.end();
			return;
		}
		pool.query(`select f_get_user($1) as user`, [decoded.user], (err, query) => {
			if (err) {
				console.log(err)
				res.status(404).send(err);
				res.end();
				return;
			} else {

				let user = query.rows[0].user;

				res.status(200);
				res.json({
					success: true,
					message: 'Connection Successful',
					user: user
				});
				res.end();
				return;
			}


		});


	});
};

module.exports.confirmEmail = function (req, res) {
	let token = req.body.token;
	jwt.verify(token, authConfig.mail_secret, function (err, decoded) {
		if (err) {
			res.status(200);
			res.json({
				message: 'El token a expirado.',
			});
			res.end();
			return;
		}
		console.log(decoded)
		connection = mysql.createConnection(dbConfig.db_credentials);
		connection.query(`SELECT confirm_token FROM users WHERE email = ?`, [decoded.email], function (err, rows) {
			if (err) {
				connection.end();
				console.log('no se que wea');
				res.status(404).send(err);
				res.end();
				return;
			}
			let user_token = rows[0];
			console.log(token);
			if (user_token.confirm_token == token) {
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
			} else {
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

validPassword = function (password, salt, hash) {
	var hashVerified = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
	console.log(hashVerified);
	console.log(hash);
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