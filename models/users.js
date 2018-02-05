var mysqlModel = require('mysql-model');
var db = require('../config/db');

var connection = mysqlModel.createConnection(db.db_credentials);
  
var Users = connection.extend({
    tableName: "users",
});

module.exports = Users;