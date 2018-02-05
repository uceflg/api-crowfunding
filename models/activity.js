const mongoose = require('mongoose');
//const Schema = mongoose.Schema;

var activitySchema = new mongoose.Schema({
    actividad: String,
    finicio: Date,
    ffin: Date
},
    { collection: 'sl_activities' });

mongoose.model('Activity', activitySchema);
//module.exports = mongoose.model('Post', postSchema);