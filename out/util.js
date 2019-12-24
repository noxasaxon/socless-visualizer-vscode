"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function debounce(func, wait) {
    let id;
    return function () {
        const args = arguments;
        const later = function () {
            id = null;
            func.apply(null, args);
        };
        clearTimeout(id);
        id = setTimeout(later, wait);
    };
}
exports.debounce = debounce;
//# sourceMappingURL=util.js.map