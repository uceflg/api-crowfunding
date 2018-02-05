var mysqlModel = require('mysql-model');
var db = require('../config/db');
var Category = require('./categories')

var connection = mysqlModel.createConnection(db.db_credentials);
  
var Rewards = connection.extend({
    tableName: "rewards",
});

module.exports = Rewards;