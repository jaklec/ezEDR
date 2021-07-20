const defaults = require("../jest.config");

module.exports = {
  ...defaults,
  rootDir: ".",
  testRegex: "e2e/.+\\.test\\.(t|j)s$",
};
