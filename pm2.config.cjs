// PM2 ecosystem — add new dashboards here
// Start:   pm2 start pm2.config.cjs
// Stop:    pm2 stop all
// Restart: pm2 restart all
// Logs:    pm2 logs
// Auto-start on login: pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      name: 'home',
      script: 'npx',
      args: 'serve ./home -l 4000',
      cwd: '.',
      watch: false,
      autorestart: true,
    },
    {
      name: 'api',
      script: 'node',
      args: 'server/index.js',
      cwd: '.',
      watch: false,
      autorestart: true,
      env: { PORT: '4001' },
    },
  ],
}
