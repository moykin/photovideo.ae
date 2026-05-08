module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            `*.${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
            'cdn.photovideo.ae',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            `*.${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
            'cdn.photovideo.ae',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // v1.1: removed `enabled` option — deprecated in Strapi v5 (causes warning)
      headers: '*',
      origin: [
        'http://localhost:3000',
        'https://photovideo.ae',
        'https://www.photovideo.ae',
        'https://api.photovideo.ae',
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
