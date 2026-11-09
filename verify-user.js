const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: "postgresql://postgres.tfjbkvxxdglxujnrcaeb:HOMETABLETUSKACT423188@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

// Verificar si el usuario test existe
pool.query('SELECT id, email, username, "firstName", "lastName" FROM "user" WHERE email = $1 OR username = $2', ['test@example.com', 'testuser'])
  .then(r => {
    console.log('Usuario test:', r.rows.length > 0 ? JSON.stringify(r.rows[0], null, 2) : 'No existe');
    pool.end();
  })
  .catch(e => { console.error(e); pool.end(); });