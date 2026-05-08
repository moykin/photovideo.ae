'use strict';

/**
 * portfolio router
 *
 * v1.0 — initial (CRUD via createCoreRouter spread)
 * v1.1 — Strapi v5: same lazy-getter fix as booking router.
 *         All routes declared explicitly to avoid schema-not-loaded crash.
 */

module.exports = {
  routes: [
    // v1.1: Custom route — increments view counter without full PUT (avoids permission issues)
    {
      method: 'POST',
      path: '/portfolios/:id/views',
      handler: 'portfolio.incrementViews',
      config: { policies: [], middlewares: [] },
    },
    // Standard CRUD routes
    { method: 'GET',    path: '/portfolios',     handler: 'portfolio.find',    config: { policies: [], middlewares: [] } },
    { method: 'GET',    path: '/portfolios/:id', handler: 'portfolio.findOne', config: { policies: [], middlewares: [] } },
    { method: 'POST',   path: '/portfolios',     handler: 'portfolio.create',  config: { policies: [], middlewares: [] } },
    { method: 'PUT',    path: '/portfolios/:id', handler: 'portfolio.update',  config: { policies: [], middlewares: [] } },
    { method: 'DELETE', path: '/portfolios/:id', handler: 'portfolio.delete',  config: { policies: [], middlewares: [] } },
  ],
};
