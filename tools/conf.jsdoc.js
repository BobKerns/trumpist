/*
 * Copyright (c) 2018 Bob Kerns.
 */

module.exports = {
    "plugins": [
        "plugins/markdown"
    ],
    "recurseDepth": 1,
    "source": {
        "include": ["package.json", "../README.md", "brain/", "database/"],
        "includePattern": ".+\\.js$",
        "excludePattern": "(^|\\/|\\\\)(_|#|\\.)"
    },
    "sourceType": "module",
    "tags": {
        "allowUnknownTags": true,
        "dictionaries": ["jsdoc", "closure"]
    },
    "templates": {
        "default": {
            "staticFiles": {
                "include": [
                    "./images"
                ]
            }
        },
        "cleverLinks": true,
        "monospaceLinks": false
    }
};