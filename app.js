const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session')
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const hbs = require('express-handlebars')
require('./configuration/database/mongoose')
const handlebars = require('handlebars')
require('dotenv').config()
const helpers = require('./public/javascripts/pagination')

handlebars.registerHelper("inc", function(value, options){
  return parseInt(value)+1
})

handlebars.registerHelper('eq', function (a, b) {
  return a == b;
  })

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials', runtimeOptions:{allowProtoPropertiesByDefault:true, allowProtoMethodsByDefault:true,},helpers:helpers}))


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({secret:process.env.SESSION_KEY, cookie:{maxAge:600000}, resave:false, saveUninitialized:true}));


app.use(express.static(path.join(__dirname, 'public')));


app.use('/', userRouter);
app.use('/', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000)


