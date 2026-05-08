'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::portfolio.portfolio', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: user.id,
    };

    return super.create(ctx);
  },

  async incrementViews(ctx) {
    const { id } = ctx.params;
    const portfolio = await strapi.entityService.findOne('api::portfolio.portfolio', id);
    if (!portfolio) return ctx.notFound();

    await strapi.entityService.update('api::portfolio.portfolio', id, {
      data: { views: (portfolio.views || 0) + 1 },
    });

    return { data: { views: (portfolio.views || 0) + 1 } };
  },
}));
