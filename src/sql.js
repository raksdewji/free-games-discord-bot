const pg = require('pg');

require('dotenv').config();

// PostgreSQL Heroku config
const config = {
  user: process.env.DB_user,
  database: process.env.DB,
  password: process.env.DB_password,
  host: process.env.DB_host,
  ssl: { rejectUnauthorized: false },
  port: 5432,
  poolSize: 5,
  poolIdleTimeout: 30000,
  reapIntervalMillis: 10000
};

const pool = new pg.Pool(config);

pool.connect((isErr, client, done) => {
  if (isErr) {
    console.log(`Connect query error: ${isErr.message}`);
    return;
  }

  client.query('select now();', [], (err, queryResult) => {
    if (err) {
      console.log('postgresql: connection failed ->', err);
    } else {
      // Query result
      console.log(
        `postgresql: connection established (${queryResult.rows[0].now})`
      );
    }

    done();
  });
});

const SQL = (query) => {
  return new Promise((resolve, reject) => {
    pool.query(query, (err, res) => {
      console.log('executing: ', query); // for debugging purposes, remove later
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

pool.on('error', (err) => console.log('postgresql: error ->', err));

module.exports = { SQL };
