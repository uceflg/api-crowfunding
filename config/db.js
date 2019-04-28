require('dotenv').config();

module.exports = {
    db_credentials: {
        host     : process.env.DB_HOST,
        user     : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_SCHEMA,
        port     : process.env.DB_PORT
    } 
};