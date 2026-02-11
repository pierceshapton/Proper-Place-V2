module.exports = {
  apps: [
    {
      name: 'proper-place-backend',
      script: './src/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Auto-restart on crash
      autorestart: true,
      // Max memory restart
      max_memory_restart: '500M',
      // Watch for file changes (development only)
      watch: false,
      // Ignore node_modules and .env
      ignore_watch: ['node_modules', '.env', '*.log'],
      // Error and output logs
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Health checks
      cron_restart: '0 0 * * *', // Restart daily at midnight
      // Min uptime before restart counts as crash (prevents restart loops)
      min_uptime: '10s',
      // Max number of restarts per hour
      max_restarts: 10,
      // Custom env variables
      merge_logs: true,
    },
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/proper-place.git',
      path: '/var/www/proper-place-backend',
      'post-deploy':
        'npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production',
    },
  },
};
