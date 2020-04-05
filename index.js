const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const corsWhiteList = new Set(['http://localhost:3000']);
const corsOptions = {
  origin: (origin, callback) => {
    // if (corsWhiteList.has(origin)) {
    if (true) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

const {
  controller: dbController,
  routes: dbRoutes
} = require('./routes/db/controller');
const {
  controller: indexController,
  routes: indexRoutes
} = require('./routes/index/controller');
const {
  controller: apiGetController,
  routes: apiGetRoutes
} = require('./routes/apiGet/controller');
const {
  controller: apiSetController,
  routes: apiSetRoutes
} = require('./routes/apiSet/controller');
const {
  controller: timesController,
  routes: timesRoutes
} = require('./routes/times/controller');

const PORT = process.env.PORT || 5000;

console.log('Local env check, db url: ', process.env.DATABASE_URL);

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(cors(corsOptions))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get(indexRoutes, indexController)
  .get(timesRoutes, timesController)
  .get(dbRoutes, dbController)
  .get(apiGetRoutes, apiGetController)
  .post(apiSetRoutes, apiSetController)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
