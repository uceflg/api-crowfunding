const express = require("express");
const mongoose = require("mongoose");
const Work = mongoose.model('Work');
const Contact = mongoose.model('Contact');
const Post = mongoose.model('Post');
const dateFormat = require('dateformat');
const fs = require('fs');

module.exports.workWithUsPost = function (req, res) {

    var work = new Work();

    work.actividad = req.body.actividad;
    work.razon = req.body.razon;
    work.especialidad = req.body.especialidad;
    work.email = req.body.email;
    work.nombre = req.body.nombre;
    work.save(function (err, addWork) {
        if (err) {
            res.send(err);
        }
        res.json(addWork);
    });
};

module.exports.workWithUsGet = function (req, res) {
    console.log('Requesting posts');
    Work.find({})
        .exec(function (err, sl_workus) {
            if (err) {
                console.log('Error getting the posts');
            } else {
                res.json(sl_workus);
            }
        });
};

module.exports.contactUs = function (req, res) {
    var contact = new Contact();

    contact.motivo = req.body.motivo;
    contact.email = req.body.email;
    contact.nombre = req.body.nombre;
    contact.save(function (err, addContact) {
        if (err) {
            res.send(err);
        }
        res.json(addContact);
    });
};

module.exports.posts = function (req, res) {
    console.log('Requesting posts');
    Post.find({})
        .exec(function (err, sl_posts) {
            if (err) {
                console.log('Error getting the posts');
            } else {
                res.json(sl_posts);
            }
        });
};

module.exports.details = function (req, res) {
    console.log('Requesting post');
    Post.findById(req.params.id)
        .exec(function (err, post) {
            if (err) {
                console.log('Error getting the post');
            } else {
                res.json(post);
            }
        });
};


module.exports.createPost = function (req, res) {
    console.log(req.body);
    var post = new Post();
    var d = new Date();
    var x = new Date().getTimezoneOffset();
    var n = d - x;
    var h = new Date(d.getTime() - x * 60 * 1000);

    post.titulo = req.body.titulo;
    post.contenido = req.body.contenido;
    post.fecha = dateFormat(h, "isoDateTime");
    post.save(function (err, createPost) {
        if (err) {
            res.send(err);
        }
        res.json(createPost);
    });
};

module.exports.updatePost = function (req, res) {
    Post.findById(req.params.id)
        .exec(function (err, post) {
            if (err) {
                console.log('Error getting the post');
            } else {
                post.titulo = req.body.titulo;
                post.contenido = req.body.contenido;
                post.save(function (err, createPost) {
                    if (err) {
                        res.send(err);
                    }
                    res.json(createPost);
                });
            }
        });
};

module.exports.excel = function (req, res) {
    var writeStream = fs.createWriteStream("file.xlsx");

    var header = "Sl No" + "\t" + " Age" + "\t" + "Name" + "\n";
    var row1 = "0" + "\t" + " 21" + "\t" + "Rob" + "\n";
    var row2 = "1" + "\t" + " 22" + "\t" + "bob" + "\n";

    writeStream.write(header);
    writeStream.write(row1);
    writeStream.write(row2);

    writeStream.close();

    res.send(writeStream);
};