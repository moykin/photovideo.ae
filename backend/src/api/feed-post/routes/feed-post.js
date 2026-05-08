'use strict';

/**
 * feed-post router
 *
 * v1.0 — initial (CRUD via createCoreRouter spread)
 * v1.1 — Strapi v5: same lazy-getter fix as booking/portfolio routers.
 *         All routes declared explicitly to avoid schema-not-loaded crash.
 */

module.exports = {
  routes: [
    // v1.1: Custom route — toggles like on a feed post (authenticated user)
    {
      method: 'POST',
      path: '/feed-posts/:id/like',
      handler: 'feed-post.like',
      config: { policies: [], middlewares: [] },
    },
    // Standard CRUD routes
    { method: 'GET',    path: '/feed-posts',     handler: 'feed-post.find',    config: { policies: [], middlewares: [] } },
    { method: 'GET',    path: '/feed-posts/:id', handler: 'feed-post.findOne', config: { policies: [], middlewares: [] } },
    { method: 'POST',   path: '/feed-posts',     handler: 'feed-post.create',  config: { policies: [], middlewares: [] } },
    { method: 'PUT',    path: '/feed-posts/:id', handler: 'feed-post.update',  config: { policies: [], middlewares: [] } },
    { method: 'DELETE', path: '/feed-posts/:id', handler: 'feed-post.delete',  config: { policies: [], middlewares: [] } },
  ],
};
