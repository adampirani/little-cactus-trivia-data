/**
 * @module db/controller
 * Sample dumping contents of *real* heroku db
 */

const { Pool } = require('pg');

const routes = ['/db'];

const controller = async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });

  try {
    const client = await pool.connect();
    const tableNames = ['test_table'];
    const data = {
      tables: []
    };

    const tablePromises = [];
    tableNames.forEach(async tableName => {
      tablePromises.push(client.query(`SELECT * FROM ${tableName}`));
    });

    const tableResults = await Promise.all(tablePromises);

    tableResults.forEach((tableResult, index) => {
      const tableName = tableNames[index];
      const tableRows = tableResult ? tableResult.rows : null;
      const tableData = {
        tableName,
        tableRows
      };
      data.tables.push(tableData);
    });

    res.render('pages/db', data);
    client.release();
  } catch (err) {
    console.error(err);
    res.send('Error ' + err);
  }
};

module.exports = {
  controller,
  routes
};
