'use strict';

/**
 * users-permissions plugin extension entry point
 *
 * v1.0 — подключаем кастомный auth контроллер.
 *         Strapi подхватывает этот файл автоматически при наличии
 *         src/extensions/users-permissions/strapi-server.js
 */

const authController = require('./controllers/auth');

module.exports = (plugin) => {
  // Переопределяем только register — остальные методы (login, callback, connect)
  // берутся из стандартного контроллера Strapi
  plugin.controllers.auth.register = authController.register;

  return plugin;
};
