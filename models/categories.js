var mysqlModel = require('mysql-model');
var db = require('../config/db');

var connection = mysqlModel.createConnection(db.db_credentials);
  
var Categories = connection.extend({
    tableName: "categories",
});

module.exports = Categories;