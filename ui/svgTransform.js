/*
 * Copyright (c) 2018 Bob Kerns.
 */

module.exports = {
    process() {
        return 'module.exports = {};';
    },
    getCacheKey() {
        // The output is always the same.
        return 'svgTransform';
    },
};
