import dotenv from 'dotenv';

dotenv.config();

const { default: app } = await import('./backend/api/index.mjs');
const port = Number(process.env.PORT || 8795);

app.listen(port, () => {
  console.log(`VoltPilot API listening on http://127.0.0.1:${port}`);
});
