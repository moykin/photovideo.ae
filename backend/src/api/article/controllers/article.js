'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::article.article', ({ strapi }) => ({
  async findOne(ctx) {
    const response = await super.findOne(ctx);

    // Increment view count
    if (response?.data?.id) {
      strapi.entityService.update('api::article.article', response.data.id, {
        data: { views: (response.data.views || 0) + 1 },
      });
    }

    return response;
  },
}));
