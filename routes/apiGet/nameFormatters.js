const SEASONS = {
  f: 'Fall',
  w: 'Winter'
};

const DAYS = {
  w: 'Wednesday',
  s: 'Sunday'
};

const TIMES = {
  e: 'Early',
  l: 'Late'
};

const leagueIdToName = leagueId => {
  const [year, season, day, time] = leagueId.split('-');

  let leagueName = `${SEASONS[season]} ${year} ${DAYS[day]}`;
  if (time) {
    leagueName += ` ${TIMES[time]}`;
  }
  leagueName += ' Session';

  return leagueName;
};

module.exports = {
  leagueIdToName
};
