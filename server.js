const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const logger = require('morgan');
const app = express();
const dateFormat = require('dateformat');
const dotenv = require('dotenv');
const cors = require('cors'); //add cors
dotenv.config();

// [SH] Bring in the routes for the API (delete the default routes)
const routesApi = require('./routes/index');

//const api = require('./server/routes/apiContact');

app.use(logger('dev'));
app.use(cors()); //add cors
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
//app.use(express.static(path.join(__dirname, 'dist')));

// Set our api routes
app.use('/api', routesApi);

// Return other routes to Angular index file..
/*app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});*/


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// [SH] Catch unauthorised errors
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401);
        res.json({ "message": err.name + ": " + err.message });
    }
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


// Set port
const port = process.env.PORT || '3000';
app.set('port', port);

// Create the HTTP Server
const server = http.createServer(app);

server.listen(port, () => console.log(`Running on localhost:${port}`));