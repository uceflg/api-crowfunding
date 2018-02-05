const mongoose = require('mongoose');
//const Schema = mongoose.Schema;

var workSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    especialidad: String,
    razon: String,
    actividad: String
},
    { collection: 'sl_workus' });

mongoose.model('Work', workSchema);

//module.exports = mongoose.model('Work', workSchema);