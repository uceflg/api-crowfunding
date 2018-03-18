require('dotenv').config();

module.exports = {
    auth: {
        jwt_secret: process.env.JWT_SECRET, 
        mail_secret: process.env.MAIL_SECRET,
        user_email: process.env.USER_EMAIL,
        pass_email: process.env.PASS_EMAIL
    }
};