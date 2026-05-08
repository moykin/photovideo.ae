module.exports = {
  apps: [
    {
      name: 'photovideo-backend',
      cwd: '/var/www/photovideo/backend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 1337,
      },
      error_file: '/var/log/pm2/strapi-error.log',
      out_file: '/var/log/pm2/strapi-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'photovideo-frontend',
      cwd: '/var/www/photovideo/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/next-error.log',
      out_file: '/var/log/pm2/next-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
