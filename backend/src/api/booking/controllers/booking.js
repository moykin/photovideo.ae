'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { randomUUID } = require('crypto');

module.exports = createCoreController('api::booking.booking', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    ctx.request.body.data = {
      ...ctx.request.body.data,
      client: user.id,
      status: 'pending',
      referenceCode: `PV-${randomUUID().slice(0, 8).toUpperCase()}`,
    };

    const response = await super.create(ctx);

    // Notify provider via email
    const booking = response.data;
    const provider = await strapi.entityService.findOne(
      'plugin::users-permissions.user',
      booking.provider?.id || ctx.request.body.data.provider,
      { populate: ['*'] }
    );

    if (provider?.email) {
      await strapi.plugins['email'].services.email.send({
        to: provider.email,
        subject: `New booking request - ${booking.referenceCode}`,
        text: `You have a new booking request from ${user.displayName || user.username}.
Event: ${booking.eventType}
Date: ${booking.eventDate}
Location: ${booking.location}
Log in to your dashboard to confirm or reject.`,
      });
    }

    return response;
  },

  async updateStatus(ctx) {
    const { id } = ctx.params;
    const { status, notes } = ctx.request.body;
    const user = ctx.state.user;

    if (!user) return ctx.unauthorized();

    const booking = await strapi.entityService.findOne('api::booking.booking', id, {
      populate: ['client', 'provider'],
    });

    if (!booking) return ctx.notFound();

    const isProvider = booking.provider?.id === user.id;
    const isClient = booking.client?.id === user.id;

    const allowedProviderStatuses = ['confirmed', 'rejected', 'in_progress'];
    const allowedClientStatuses = ['cancelled'];

    if (isProvider && !allowedProviderStatuses.includes(status)) {
      return ctx.badRequest('Invalid status transition for provider');
    }
    if (isClient && !allowedClientStatuses.includes(status)) {
      return ctx.badRequest('Invalid status transition for client');
    }
    if (!isProvider && !isClient) {
      return ctx.forbidden();
    }

    const updateData = { status };
    if (notes && isProvider) updateData.providerNotes = notes;
    if (notes && isClient) updateData.clientNotes = notes;

    const updated = await strapi.entityService.update('api::booking.booking', id, {
      data: updateData,
    });

    // If completed, update provider stats
    if (status === 'completed') {
      await strapi.entityService.update(
        'plugin::users-permissions.user',
        booking.provider.id,
        { data: { completedBookings: (booking.provider.completedBookings || 0) + 1 } }
      );
    }

    return { data: updated };
  },
}));
