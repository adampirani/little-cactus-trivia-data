const scheduleQueries = require('./queries');
const commonQueries = require('../commonQueries');

const getScheduleData = async (client, leagueId) => {
  const { leagueInfoById, teamsByLeague } = commonQueries;
  const { gamesWithEndsByLeague } = scheduleQueries;

  const leagueInfoByIdResult = await client.query({
    ...leagueInfoById,
    values: [leagueId]
  });

  const leagueData = leagueInfoByIdResult.rows[0];

  const league = {
    id: leagueId,
    name: leagueData.name,
    currentWeek: parseInt(leagueData.current_week, 0)
  };

  const teamsByLeagueResult = await client.query({
    ...teamsByLeague,
    values: [leagueId]
  });

  const teamMap = teamsByLeagueResult.rows.reduce((map, row) => {
    const { id, name } = row;
    map[id] = {
      id,
      name
    };
    return map;
  }, {});

  const gamesWithEndsByLeagueResult = await client.query({
    ...gamesWithEndsByLeague,
    values: [leagueId]
  });

  let currentWeekBeingAdded = null;
  let currentGameBeingModified = null;
  let currentWeekIndex = 0;
  let currentGameIndex = 0;
  const weeks = [];
  gamesWithEndsByLeagueResult.rows.forEach(row => {
    const { week, sheet, id, top_team, bottom_team, score, scoring_team } = row;

    if (week !== currentWeekBeingAdded) {
      currentWeekBeingAdded = week;
      currentGameBeingModified = null;
      weeks.push({
        week,
        games: []
      });
      currentWeekIndex = weeks.length - 1;
    }

    const currentGames = weeks[currentWeekIndex].games;

    if (id !== currentGameBeingModified) {
      currentGameBeingModified = id;
      currentGames.push({
        sheet,
        id,
        teams: {
          top: teamMap[top_team],
          bottom: teamMap[bottom_team]
        },
        ends: []
      });
      currentGameIndex = currentGames.length - 1;
    }

    if (scoring_team) {
      const currentGame = currentGames[currentGameIndex];

      currentGame.ends.push({
        isBlank: false,
        scoringTeam: scoring_team,
        score
      });
    }
  });

  return {
    league,
    weeks
  };
};

module.exports = {
  getScheduleData
};
