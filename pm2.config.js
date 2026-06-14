// PM2 ecosystem — add new dashboards here
// Start:   pm2 start pm2.config.js
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
      name: 'ideas',
      script: 'npx',
      args: 'vite preview --port 4001 --host',
      cwd: './dashboard',
      watch: false,
      autorestart: true,
    },
    {
      name: 'jobs',
      script: 'npx',
      args: 'vite preview --port 4002 --host',
      cwd: './dashboard-vue',
      watch: false,
      autorestart: true,
    },
  ],
}
