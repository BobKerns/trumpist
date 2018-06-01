/*
 * Copyright (c) 2018 Bob Kerns.
 */

module.exports = {
    "plugins": [
        "plugins/markdown",
        "plugins/summarize"
    ],
    "recurseDepth": 1,
    "source": {
        "include": ["package.json", "../README.md"],
        "includePattern": ".+\\.js$",
        "excludePattern": "(^|\\/|\\\\)(_|#|\\.)"
    },
    "sourceType": "module",
    "tags": {
    "allowUnknownTags": true,
        "dictionaries": ["jsdoc","closure"]
},
    "templates": {
    "cleverLinks": false,
        "monospaceLinks": false
    }
};