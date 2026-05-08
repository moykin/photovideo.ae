/**
 * Strapi plugins configuration
 *
 * v1.0 — initial setup
 * v1.1 — S3 и Email стали условными (только если заданы env переменные),
 *         иначе Strapi падал при старте без AWS/SMTP credentials в dev режиме.
 */

module.exports = ({ env }) => {
  // Базовый конфиг — всегда присутствует
  const config = {
    // Настройки плагина users-permissions: JWT срок жизни и rate limit на auth
    'users-permissions': {
      config: {
        jwt: {
          expiresIn: '30d',
        },
        ratelimit: {
          interval: 60000,
          max: 10,
        },
      },
    },
  };

  // S3 upload провайдер — подключается только если AWS credentials заданы в .env
  // В dev режиме без ключей Strapi использует локальное хранилище (public/uploads)
  if (env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY')) {
    config.upload = {
      config: {
        provider: 'aws-s3',
        providerOptions: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
          region: env('AWS_REGION', 'ap-south-1'),
          params: { Bucket: env('AWS_BUCKET', 'photovideo-ae-media') },
        },
        actionOptions: { upload: {}, uploadStream: {}, delete: {} },
      },
    };
  }

  // Email провайдер через Nodemailer — только если SMTP_HOST задан в .env
  // В dev режиме письма просто не отправляются (нет ошибки)
  if (env('SMTP_HOST')) {
    config.email = {
      config: {
        provider: 'nodemailer',
        providerOptions: {
          host: env('SMTP_HOST'),
          port: env.int('SMTP_PORT', 587),
          auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
          secure: false,
          requireTLS: true,
        },
        settings: {
          defaultFrom: env('EMAIL_FROM', 'noreply@photovideo.ae'),
          defaultReplyTo: env('EMAIL_REPLY_TO', 'support@photovideo.ae'),
        },
      },
    };
  }

  return config;
};
