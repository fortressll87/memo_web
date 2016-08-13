var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');

var nodemailer = require('nodemailer');

var session = require('express-session');
var passport = require('passport');
var expressValidator = require('express-validator');

var bodyParser = require('body-parser');
var multer = require('multer');
var flash = require('connect-flash');
var config = require('./config.json');

var bcrypt = require('bcryptjs');

var db =require('monk')(config.db_connection_url);
var mongoose = require('mongoose');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var upload = multer({ dest: './uploads' });
app.use(upload);

var mysql = require('mysql');
var mysqlConn = mysql.createConnection({
    host    :'192.168.10.33',
    port : 3306,
    user : 'hadoop',
    password : 'hadoop',
    database:'master'
});

mysqlConn.connect(function(err) {
    if (err) {
        console.error('mysql connection error');
        console.error(err);
        throw err;
    }
    console.log("Connected to mysql server");	
});

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    req.mysqlConn = mysqlConn;
    next();
});

// [ CONFIGURE mongoose ]
/*
// CONNECT TO MONGODB SERVER
var mongodb = mongoose.connection;
mongodb.on('error', console.error);
mongodb.once('open', function(){
    // CONNECTED TO MONGODB SERVER
    console.log("Connected to mongod server");
});
 
mongoose.connect('mongodb://admin:bigdata12@ds027819.mlab.com:27819/contents?authMechanism=SCRAM-SHA-1');
///////
*/
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Handler express session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// router js
var routes = require('./routes/index');
var about = require('./routes/about');
var memo = require('./routes/memo');
var checklist = require('./routes/checklist');
var users = require('./routes/users');
var greeting = require('./routes/greeting');
var work = require('./routes/work');
var job = require('./routes/job');

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.'),
        root = namespace.shift(),
        formParam = root;

        while(namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
          param: formParam,
          msg: msg,
          value: value
        };
    }
}));

// flash
app.use(flash());
app.use(function(req, res, next) {
   res.locals.messages = require('express-messages')(req, res);
   next();
});

app.get('*', function(req, res, next) {
  res.locals.user = req.user || null;
  next();
});

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/about', about);
app.use('/memo', memo);
app.use('/checklist', checklist);
app.use('/users', users);
app.use('/greeting', greeting);
app.use('/work', work);
app.use('/job', job);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
