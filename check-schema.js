const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: "postgresql://postgres.tfjbkvxxdglxujnrcaeb:HOMETABLETUSKACT423188@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = \'user\'').then(r => {
  console.log('Columns in public.user table:', r.rows.map(x => x.column_name).join(', '));
  pool.end();
}).catch(e => { console.error(e); pool.end(); });