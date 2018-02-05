const express = require("express");
const mongoose = require("mongoose");
const Activity = mongoose.model('Activity');
const dateFormat = require('dateformat');

module.exports.newActivities = function (req, res) {

    var act = new Activity();

    act.actividad = req.body.actividad;
    act.finicio = req.body.finicio;
    act.ffin = req.body.ffin;
    act.save(function (err, createPost) {
        if (err) {
            res.send(err);
        }
        res.json(createPost);
    });
};

module.exports.getActivities = function (req, res) {
    console.log('Requesting activities');
    Activity.find({})
        .exec(function (err, sl_acti) {
            if (err) {
                console.log('Error getting the activities');
            } else {
                res.json(sl_acti);
            }
        });
};

module.exports.updateActivity = function (req, res) {
    Activity.findById(req.body._id)
        .exec(function (err, act) {
            if (err) {
                console.log('Error getting the post');
            } else {
                act.actividad = req.body.actividad;
                act.finicio = req.body.finicio;
                act.ffin = req.body.ffin;
                act.save(function (err, updateAct) {
                    if (err) {
                        res.send(err);
                    }
                    res.json(updateAct);
                });
            }
        });
};