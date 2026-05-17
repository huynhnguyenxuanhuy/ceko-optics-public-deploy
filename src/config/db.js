const dbClient = (process.env.DB_CLIENT || '').toLowerCase();
const databaseUrl = process.env.DATABASE_URL || '';
const isMysql = dbClient === 'mysql' || databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://');

let pool;

const normalizeMysqlSql = (text) =>
  text
    .replace(/\$(\d+)/g, '?')
    .replace(/\bILIKE\b/gi, 'LIKE');

if (isMysql) {
  const mysql = require('mysql2/promise');
  const config = databaseUrl
    ? databaseUrl.replace(/^mysql2:\/\//, 'mysql://')
    : {
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      };

  pool = mysql.createPool({
    uri: typeof config === 'string' ? config : undefined,
    ...(typeof config === 'string' ? {} : config),
    waitForConnections: true,
    connectionLimit: 20,
    namedPlaceholders: false,
    charset: 'utf8mb4',
  });
} else {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });
}

const query = async (text, params = []) => {
  if (!isMysql) return pool.query(text, params);

  const [result] = await pool.query(normalizeMysqlSql(text), params);
  const rows = Array.isArray(result) ? result : [];
  return {
    rows,
    rowCount: Array.isArray(result) ? result.length : result.affectedRows || 0,
    affectedRows: Array.isArray(result) ? result.length : result.affectedRows || 0,
    insertId: Array.isArray(result) ? undefined : result.insertId,
  };
};

const withTransaction = async (callback) => {
  if (!isMysql) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const client = await pool.getConnection();
  const txClient = {
    query: async (text, params = []) => {
      const [result] = await client.query(normalizeMysqlSql(text), params);
      return {
        rows: Array.isArray(result) ? result : [],
        rowCount: Array.isArray(result) ? result.length : result.affectedRows || 0,
        affectedRows: Array.isArray(result) ? result.length : result.affectedRows || 0,
        insertId: Array.isArray(result) ? undefined : result.insertId,
      };
    },
  };
  try {
    await client.beginTransaction();
    const result = await callback(txClient);
    await client.commit();
    return result;
  } catch (err) {
    await client.rollback();
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction, isMysql };
