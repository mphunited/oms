const postgres = require('postgres');
const sql = postgres('postgresql://postgres.grdstkymlnqznekrgmrw:Fairhope_1270@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {prepare: false});
sql.unsafe('SELECT 1').then(r => {
  console.log('Connected:', r);
  process.exit(0);
}).catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});