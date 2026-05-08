/**
 * PostCSS configuration
 *
 * v1.0 — initial: tailwindcss + autoprefixer.
 *         Без этого файла Next.js не обрабатывает @tailwind-директивы в globals.css
 *         и страница рендерится без стилей.
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
