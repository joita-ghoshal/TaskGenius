const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 90000,
    teardownTimeout: 30000,
    reporters: ['default']
  }
});
