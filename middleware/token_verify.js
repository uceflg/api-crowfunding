var jwt = require('jsonwebtoken');
var authConfig = require('../config/auth_conf').auth;

module.exports.validateToken = function (req, res, next) {
  let token = req.headers.auth;
  console.log(req.body);
  if (!token) {
    return res.status(202).send({ err: "TOKEN_ERROR: No valid token" })
  };
  jwt.verify(token, authConfig.jwt_secret, function (err, decoded) {
    if (err) {
      res.status(204).send(err);
      res.end();
      return;
    }else{
      res.locals.id = decoded.user;
      next()
    }
  })
}