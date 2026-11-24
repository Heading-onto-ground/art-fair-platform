/* eslint-disable @typescript-eslint/no-require-imports */
// Next.js 13.5 only loads postcss.config.js or postcss.config.cjs.
// postcss.config.mjs is ignored, so @import "tailwindcss" was inlined as raw
// CSS and @tailwind utilities never became class rules.
const path = require("path");

module.exports = {
  plugins: {
    "@tailwindcss/postcss": {
      base: path.resolve(__dirname),
    },
  },
};
