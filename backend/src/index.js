'use strict';

/**
 * Strapi bootstrap — seeds Users & Permissions role permissions on startup.
 *
 * Idempotent: only creates a permission record if it doesn't already exist.
 * Survives a fresh/empty DB so registration, login, OAuth and public reads
 * work without manually clicking through Settings → Roles in the admin.
 *
 * The key fix: Authenticated role needs `user.update` — signUp() does
 * POST /auth/local/register then PUT /users/:id to save userType/displayName,
 * which 403'd ("Forbidden") because that permission was off by default.
 */

const PUBLIC_ACTIONS = [
  'plugin::users-permissions.auth.register',
  'plugin::users-permissions.auth.callback',
  'plugin::users-permissions.auth.connect',
  'plugin::users-permissions.auth.forgotPassword',
  'plugin::users-permissions.auth.resetPassword',
  'plugin::users-permissions.auth.emailConfirmation',
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  'api::article.article.find',
  'api::article.article.findOne',
  'api::portfolio.portfolio.find',
  'api::portfolio.portfolio.findOne',
  'api::portfolio.portfolio.incrementViews',
  'api::feed-post.feed-post.find',
  'api::feed-post.feed-post.findOne',
  'api::review.review.find',
  'api::review.review.findOne',
];

const AUTH_ACTIONS = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.update',
  'plugin::users-permissions.auth.changePassword',
  'api::article.article.find',
  'api::article.article.findOne',
  'api::portfolio.portfolio.find',
  'api::portfolio.portfolio.findOne',
  'api::portfolio.portfolio.create',
  'api::portfolio.portfolio.update',
  'api::portfolio.portfolio.incrementViews',
  'api::feed-post.feed-post.find',
  'api::feed-post.feed-post.findOne',
  'api::feed-post.feed-post.create',
  'api::feed-post.feed-post.update',
  'api::feed-post.feed-post.like',
  'api::booking.booking.find',
  'api::booking.booking.findOne',
  'api::booking.booking.create',
  'api::booking.booking.update',
  'api::review.review.find',
  'api::review.review.findOne',
  'api::review.review.create',
];

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    try {
      const grant = async (type, actions) => {
        const role = await strapi.db
          .query('plugin::users-permissions.role')
          .findOne({ where: { type } });
        if (!role) {
          strapi.log.warn(`[bootstrap] role "${type}" not found, skipping`);
          return 0;
        }
        let added = 0;
        for (const action of actions) {
          const existing = await strapi.db
            .query('plugin::users-permissions.permission')
            .findOne({ where: { action, role: { id: role.id } } });
          if (!existing) {
            await strapi.db
              .query('plugin::users-permissions.permission')
              .create({ data: { action, role: role.id } });
            added += 1;
          }
        }
        return added;
      };

      const pub = await grant('public', PUBLIC_ACTIONS);
      const auth = await grant('authenticated', AUTH_ACTIONS);
      strapi.log.info(`[bootstrap] permissions seeded — public:+${pub}, authenticated:+${auth}`);

      // Reset-password email link must point at the frontend page (not the Strapi admin).
      const upStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
      const advanced = (await upStore.get({ key: 'advanced' })) || {};
      const resetUrl = 'https://photovideo.ae/auth/reset-password';
      if (advanced.email_reset_password !== resetUrl) {
        advanced.email_reset_password = resetUrl;
        await upStore.set({ key: 'advanced', value: advanced });
        strapi.log.info('[bootstrap] reset-password URL -> ' + resetUrl);
      }

      // Email templates default sender to no-reply@strapi.io, which our SMTP
      // rejects ("Sender address rejected"). Force our own verified sender.
      const fromAddr = { name: 'PhotoVideo.ae', email: 'no-reply@photovideo.ae' };
      const emailTpl = (await upStore.get({ key: 'email' })) || {};
      let tplChanged = false;
      for (const key of ['reset_password', 'email_confirmation']) {
        const tpl = emailTpl[key];
        if (tpl && tpl.options && (!tpl.options.from || tpl.options.from.email !== fromAddr.email)) {
          tpl.options.from = { ...fromAddr };
          tpl.options.response_email = fromAddr.email;
          tplChanged = true;
        }
      }
      if (tplChanged) {
        await upStore.set({ key: 'email', value: emailTpl });
        strapi.log.info('[bootstrap] email sender -> ' + fromAddr.email);
      }
    } catch (e) {
      strapi.log.error('[bootstrap] permission seeding failed: ' + (e && e.message));
    }
  },
};
