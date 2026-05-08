'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::feed-post.feed-post', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: user.id,
    };

    return super.create(ctx);
  },

  async like(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const post = await strapi.entityService.findOne('api::feed-post.feed-post', id, {
      populate: ['likedBy'],
    });

    if (!post) return ctx.notFound();

    const alreadyLiked = post.likedBy?.some((u) => u.id === user.id);

    if (alreadyLiked) {
      await strapi.db.query('api::feed-post.feed-post').update({
        where: { id },
        data: {
          likes: Math.max(0, (post.likes || 0) - 1),
          likedBy: { disconnect: [{ id: user.id }] },
        },
      });
    } else {
      await strapi.db.query('api::feed-post.feed-post').update({
        where: { id },
        data: {
          likes: (post.likes || 0) + 1,
          likedBy: { connect: [{ id: user.id }] },
        },
      });
    }

    return { data: { liked: !alreadyLiked } };
  },
}));
