/**
 * @module apiSet/controller
 * API set (post) routes
 * @todo move to graphQL
 */
const { Pool } = require('pg');

const gameQueries = require('./queries');

const routes = ['/api/set', '/api/set/scores/:game'];

const controller = async (req, res) => {
  if (req.path.includes('/api/set/scores/')) {
    const gameIdParam = req.params.game;
    const { gameData, userName } = req.body;
    const { id, teams, ends } = gameData;

    if (gameIdParam !== id) {
      throw new Error(`Game id in route (${gameIdParam}) 
      does not match data (${id})`);
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: true
    });

    try {
      const client = await pool.connect();
      const {
        numEndsForGame,
        deleteGameEnds,
        addGameEnds,
        updateGameTeams,
        updateGameSubmission
      } = gameQueries;

      await client.query({
        ...updateGameTeams,
        values: [id, teams.top.id, teams.bottom.id]
      });

      const numEndsResult = await client.query({
        ...numEndsForGame,
        values: [id]
      });

      if (numEndsResult.rows[0].count > 0) {
        await client.query({
          ...deleteGameEnds,
          values: [id]
        });
      }

      const addAllEndsPromises = ends.map(async (end, index) => {
        const { score, scoringTeam } = end;
        const endNumber = index + 1;

        return await client.query({
          ...addGameEnds,
          values: [id, endNumber, scoringTeam, score]
        });
      });

      await Promise.all(addAllEndsPromises);

      await client.query({
        ...updateGameSubmission,
        values: [id, new Date(), userName]
      });

      client.release();
      res.send('success');
    } catch (err) {
      console.error(err);
      client.release();
      throw new Error('Failure updating db');
    }
  } else {
    res.send('api route');
  }
};

module.exports = {
  controller,
  routes
};
