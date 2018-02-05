const mongoose = require('mongoose');
//const Schema = mongoose.Schema;

var postSchema = new mongoose.Schema({
    titulo: String,
    contenido: String,
    fecha: Date
},
    { collection: 'sl_posts' });

mongoose.model('Post', postSchema);
//module.exports = mongoose.model('Post', postSchema);