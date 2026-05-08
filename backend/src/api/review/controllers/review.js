'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::review.review', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { booking: bookingId } = ctx.request.body.data;

    const booking = await strapi.entityService.findOne('api::booking.booking', bookingId, {
      populate: ['client', 'provider', 'review'],
    });

    if (!booking) return ctx.notFound('Booking not found');
    if (booking.client?.id !== user.id) return ctx.forbidden('Only the client can leave a review');
    if (booking.status !== 'completed') return ctx.badRequest('Booking must be completed');
    if (booking.review) return ctx.badRequest('Review already exists for this booking');

    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: user.id,
      provider: booking.provider?.id,
    };

    const response = await super.create(ctx);

    // Update provider rating
    const allReviews = await strapi.entityService.findMany('api::review.review', {
      filters: { provider: booking.provider?.id, isPublic: true },
    });

    const avg =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await strapi.entityService.update(
      'plugin::users-permissions.user',
      booking.provider.id,
      { data: { rating: Math.round(avg * 10) / 10, totalReviews: allReviews.length } }
    );

    return response;
  },
}));
