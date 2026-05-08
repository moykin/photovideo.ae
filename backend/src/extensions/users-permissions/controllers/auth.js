'use strict';

/**
 * Расширение контроллера auth из users-permissions
 *
 * v1.0 — Переопределяем register: стандартный endpoint Strapi сохраняет только
 *         username/email/password и игнорирует кастомные поля.
 *         Здесь после регистрации сразу обновляем displayName, userType, slug.
 */

const { sanitize } = require('@strapi/utils');

module.exports = {
  /**
   * register — регистрация с кастомными полями
   *
   * Принимает: username, email, password, displayName, userType
   * 1. Вызывает стандартную регистрацию через plugin service
   * 2. Обновляет кастомные поля сразу после создания пользователя
   * 3. Возвращает jwt + user (как стандартный endpoint)
   */
  async register(ctx) {
    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const settings = await pluginStore.get({ key: 'advanced' });

    // Запрещена регистрация если отключена в настройках
    if (!settings.allow_register) {
      return ctx.badRequest('Register action is currently disabled');
    }

    const { username, email, password, displayName, userType } = ctx.request.body;

    // Базовая валидация
    if (!username || !email || !password) {
      return ctx.badRequest('Username, email and password are required');
    }

    // Проверяем уникальность email и username перед созданием
    const [existingEmail, existingUsername] = await Promise.all([
      strapi.query('plugin::users-permissions.user').findOne({ where: { email: email.toLowerCase() } }),
      strapi.query('plugin::users-permissions.user').findOne({ where: { username } }),
    ]);

    if (existingEmail) return ctx.badRequest('Email is already taken');
    if (existingUsername) return ctx.badRequest('Username is already taken');

    // Получаем роль Authenticated
    const defaultRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    // Генерируем slug из username (уникальный идентификатор профиля)
    const baseSlug = username.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Создаём пользователя со всеми полями сразу
    const user = await strapi.query('plugin::users-permissions.user').create({
      data: {
        username,
        email: email.toLowerCase(),
        password,                              // Strapi сам хеширует через lifecycle hook
        displayName: displayName || username,
        userType: userType || 'client',
        slug: baseSlug,
        confirmed: !settings.email_confirmation, // false если включено подтверждение email
        blocked: false,
        role: defaultRole.id,
      },
    });

    // Если подтверждение email включено — отправляем письмо
    if (settings.email_confirmation) {
      await strapi
        .plugin('users-permissions')
        .service('user')
        .sendConfirmationEmail({ user });

      return ctx.send({ user: { id: user.id, username: user.username, email: user.email }, message: 'Check your email to confirm your account' });
    }

    // Генерируем JWT
    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });

    // Санитизируем пользователя перед отправкой (убираем пароль и токены)
    const schema = strapi.getModel('plugin::users-permissions.user');
    const sanitizedUser = await sanitize.contentAPI.output(user, schema);

    return ctx.send({ jwt, user: sanitizedUser });
  },
};
