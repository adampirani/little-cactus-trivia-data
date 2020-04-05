/**
 * @module apiGet/controller
 * API get (read) routes
 * @todo move to graphQL
 */

const { Pool } = require('pg');

const { getScheduleData } = require('./schedule/schedule');
const { getStandingsData } = require('./standings/standings');

const sampleScheduleData = require('./schedule/sample');
const sampleScoresData = require('./scores/sample');
const sampleStandingsData = require('./standings/sample');

const routes = [
  '/api/get',
  '/api/get/schedule/:league',
  '/api/get/standings/:league',
  '/api/get/scores/:game',
  '/api/get/sample/schedule/:league',
  '/api/get/sample/standings/:league',
  '/api/get/sample/scores/:game'
];

const controller = async (req, res) => {
  
  if (req.path.includes('/api/get/sample')) {
    if (req.path.includes('/api/get/sample/schedule')) {
      return res.send(sampleScheduleData);
    } else if (req.path.includes('/api/get/sample/standings')) {
      return res.send(sampleStandingsData);
    } else if (req.path.includes('/api/get/sample/scores')) {
      return res.send(sampleScoresData);
    }
  } else {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: true
    });

    try {
      const client = await pool.connect();
      if (req.path.includes('/api/get/schedule')) {
        const leagueId = req.params.league;
        const data = await getScheduleData(client, leagueId);
        client.release();
        return res.send(data);
      } else if (req.path.includes('/api/get/standings')) {
        const leagueId = req.params.league;
        const data = await getStandingsData(client, leagueId);
        client.release();
        return res.send(data);
      }
    } catch (err) {
      console.error(err);
      client.release();
      res.send('Error ' + err);
    }
  }

  return res.send('api route');
};

module.exports = {
  controller,
  routes
};
