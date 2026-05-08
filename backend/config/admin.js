/**
 * Strapi admin panel configuration
 *
 * v1.0 — initial: admin JWT secret, API token salt, transfer token salt.
 *         Required by Strapi v5 — missing this file causes
 *         "Missing admin.auth.secret configuration" crash on startup.
 */

module.exports = ({ env }) => ({
  // JWT secret for admin panel sessions (set ADMIN_JWT_SECRET in .env)
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  // Salt used to hash API tokens (set API_TOKEN_SALT in .env)
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  // Salt used to hash data-transfer tokens (set TRANSFER_TOKEN_SALT in .env)
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
});
