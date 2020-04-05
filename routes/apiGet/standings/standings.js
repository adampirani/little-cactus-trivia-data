const standingsQueries = require('./queries');
const commonQueries = require('../commonQueries');

const POINTS_FOR_WIN = 2;
const POINTS_FOR_DRAW = 1;

/**
 * Update `endsWon`, `totalScored` and `highEnd` for the teams involved in a game
 * @param {Number} score
 * @param {String} scoring_team 'top|bottom'
 * @param {*} topTeamObj
 * @param {*} bottomTeamObj
 */
const updateTeamStats = (score, scoring_team, topTeamObj, bottomTeamObj) => {
  if (score > 0) {
    const scoringTeamObj = scoring_team === 'top' ? topTeamObj : bottomTeamObj;
    scoringTeamObj.endsWon++;
    scoringTeamObj.totalScored += score;
    if (score > scoringTeamObj.highEnd) {
      scoringTeamObj.highEnd = score;
    }
  }
};

/**
 * Update the records for the two teams in a game
 * @param {Object} param0 Object with keys `topTeamObj`, `bottomTeamObj`, `topTeamScore`, `bottomTeamScore`
 */
const updateTeamRecords = ({
  topTeamObj,
  bottomTeamObj,
  topTeamScore,
  bottomTeamScore
}) => {
  if (!topTeamObj.recordVsOtherTeams[bottomTeamObj.id]) {
    topTeamObj.recordVsOtherTeams[bottomTeamObj.id] = {
      wins: 0,
      losses: 0,
      draws: 0
    };
  }
  if (!bottomTeamObj.recordVsOtherTeams[topTeamObj.id]) {
    bottomTeamObj.recordVsOtherTeams[topTeamObj.id] = {
      wins: 0,
      losses: 0,
      draws: 0
    };
  }
  if (topTeamScore > bottomTeamScore) {
    topTeamObj.wins++;
    topTeamObj.points += POINTS_FOR_WIN;
    topTeamObj.recordVsOtherTeams[bottomTeamObj.id].wins++;
    bottomTeamObj.losses++;
    bottomTeamObj.recordVsOtherTeams[topTeamObj.id].losses++;
  } else if (bottomTeamScore > topTeamScore) {
    bottomTeamObj.wins++;
    bottomTeamObj.points += POINTS_FOR_WIN;
    bottomTeamObj.recordVsOtherTeams[topTeamObj.id].wins++;
    topTeamObj.losses++;
    topTeamObj.recordVsOtherTeams[bottomTeamObj.id].losses++;
  } else {
    //tie
    bottomTeamObj.draws++;
    bottomTeamObj.points += POINTS_FOR_DRAW;
    bottomTeamObj.recordVsOtherTeams[topTeamObj.id].draws++;
    topTeamObj.draws++;
    topTeamObj.points += POINTS_FOR_DRAW;
    topTeamObj.recordVsOtherTeams[bottomTeamObj.id].draws++;
  }
};

// Sorting / tiebreakers
const standingsSort = (teamA, teamB) => {
  // First sort by points (2 for wins, 1 for tie)
  const pointsDiff = teamB.points - teamA.points;
  if (pointsDiff) {
    return pointsDiff;
  }

  // Then by total points scored
  const totalScoredDiff = teamB.totalScored - teamA.totalScored;
  if (totalScoredDiff) {
    return totalScoredDiff;
  }

  // Then by head-to-head records (only covers two tied teams)
  const headToHeadRecord = teamB.recordVsOtherTeams[teamA.id];
  if (headToHeadRecord) {
    const winsSurplus = headToHeadRecord.wins - headToHeadRecord.losses;
    if (winsSurplus) {
      return winsSurplus;
    }
  }

  // Finally by highest scored end
  const highEndDiff = teamB.highEnd - teamA.highEnd;
  if (highEndDiff) {
    return highEndDiff;
  }

  return 0;
};

/**
 *
 * @param {Object} client Postgres pool connection
 * @param {String} leagueId LeagueId in format [YEAR]-[SEASON]-[DAY]-[Early/Late]
 */
const getStandingsData = async (client, leagueId) => {
  const { leagueInfoById, teamsByLeague } = commonQueries;
  const { playedGamesWithEndsByLeague } = standingsQueries;

  const leagueInfoByIdResult = await client.query({
    ...leagueInfoById,
    values: [leagueId]
  });

  const leagueData = leagueInfoByIdResult.rows[0];

  const league = {
    id: leagueId,
    name: leagueData.name,
    currentWeek: parseInt(leagueData.current_week, 0),
    numRegSeasonWeeks: parseInt(leagueData.num_reg_season_weeks, 0),
    hasDivisions: leagueData.has_divisions
  };

  const divisions = {};

  const teamsByLeagueResult = await client.query({
    ...teamsByLeague,
    values: [leagueId]
  });

  const teamIdToIndex = {};

  const teams = teamsByLeagueResult.rows.map((row, index) => {
    const { id, name, division } = row;
    teamIdToIndex[id] = index;

    const teamObj = {
      id,
      name,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      totalScored: 0,
      endsWon: 0,
      highEnd: 0,
      recordVsOtherTeams: {}
    };

    if (division) {
      if (divisions[division]) {
        divisions[division].push(teamObj);
      } else {
        divisions[division] = [teamObj];
      }
    }

    return teamObj;
  });

  const playedGamesWithEndsByLeagueResult = await client.query({
    ...playedGamesWithEndsByLeague,
    values: [leagueId, league.numRegSeasonWeeks]
  });

  let currentGameBeingCheked = null;
  let topTeamScore = 0;
  let bottomTeamScore = 0;
  let topTeamObj = null;
  let bottomTeamObj = null;
  playedGamesWithEndsByLeagueResult.rows.forEach((row, index) => {
    const { id, top_team, bottom_team, score, scoring_team } = row;

    const isLastRow =
      index === playedGamesWithEndsByLeagueResult.rows.length - 1;

    if (isLastRow) {
      updateTeamStats(score, scoring_team, topTeamObj, bottomTeamObj);
      scoring_team === 'top'
        ? (topTeamScore += score)
        : (bottomTeamScore += score);

      updateTeamRecords({
        topTeamObj,
        bottomTeamObj,
        topTeamScore,
        bottomTeamScore
      });
    } else {
      const isNewGame = id !== currentGameBeingCheked;

      if (isNewGame) {
        const oldGameExists = currentGameBeingCheked !== null;
        if (oldGameExists) {
          //wrap up last game
          updateTeamRecords({
            topTeamObj,
            bottomTeamObj,
            topTeamScore,
            bottomTeamScore
          });
        }

        //set up new game
        currentGameBeingCheked = id;
        topTeamScore = 0;
        bottomTeamScore = 0;
        topTeamObj = teams[teamIdToIndex[top_team]];
        bottomTeamObj = teams[teamIdToIndex[bottom_team]];
        topTeamObj.gamesPlayed++;
        bottomTeamObj.gamesPlayed++;
      }

      updateTeamStats(score, scoring_team, topTeamObj, bottomTeamObj);
      scoring_team === 'top'
        ? (topTeamScore += score)
        : (bottomTeamScore += score);
    }
  });

  teams.sort(standingsSort);

  Object.keys(divisions).forEach(division => {
    divisions[division].sort(standingsSort);
  });

  return {
    league,
    teams,
    divisions
  };
};

module.exports = {
  getStandingsData
};
