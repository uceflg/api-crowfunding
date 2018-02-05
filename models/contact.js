const mongoose = require('mongoose');
//const Schema = mongoose.Schema;

var contactSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    motivo: String
},
    { collection: 'sl_contactus' });

mongoose.model('Contact', contactSchema);
//module.exports = mongoose.model('Contact', contactSchema);