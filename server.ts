import app from './src/http/app.js';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Auth API running on http://localhost:${port}`);
});
