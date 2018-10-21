// jest.config.js
const {defaults} = require('jest-config');
module.exports = {
    // ...
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
    testMatch: [ "**/__tests__/**/*.js?(x)", "**/?(*.)+(spec|test).ts?(x)" ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest",
        "^.+\\.svg$": "<rootDir>/svgTransform.js",
        "^.+\\.css$": "<rootDir>/cssTransform.js"
    },
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
    // ...
};/*
 * Copyright (c) 2018 Bob Kerns.
 */

