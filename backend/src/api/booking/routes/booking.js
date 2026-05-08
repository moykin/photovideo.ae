'use strict';

/**
 * booking router
 *
 * v1.0 — initial (CRUD via createCoreRouter spread)
 * v1.1 — Strapi v5: createCoreRouter().routes is a lazy getter that requires
 *         strapi.contentTypes to be initialised. Accessing it at module-load
 *         time throws "Cannot read properties of undefined (reading 'kind')".
 *         Fix: declare all routes explicitly so no runtime schema lookup happens.
 */

module.exports = {
  routes: [
    // v1.1: Custom route — provider/admin updates booking status (confirmed/declined/completed)
    {
      method: 'PATCH',
      path: '/bookings/:id/status',
      handler: 'booking.updateStatus',
      config: { policies: [], middlewares: [] },
    },
    // Standard CRUD routes (replaces createCoreRouter spread)
    { method: 'GET',    path: '/bookings',     handler: 'booking.find',    config: { policies: [], middlewares: [] } },
    { method: 'GET',    path: '/bookings/:id', handler: 'booking.findOne', config: { policies: [], middlewares: [] } },
    { method: 'POST',   path: '/bookings',     handler: 'booking.create',  config: { policies: [], middlewares: [] } },
    { method: 'PUT',    path: '/bookings/:id', handler: 'booking.update',  config: { policies: [], middlewares: [] } },
    { method: 'DELETE', path: '/bookings/:id', handler: 'booking.delete',  config: { policies: [], middlewares: [] } },
  ],
};
