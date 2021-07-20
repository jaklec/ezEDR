module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testRegex: "src/.+\\.test\\.(t|j)s",
};
