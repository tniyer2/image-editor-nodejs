
export { isUdf, isNumber, isType, isArray, isFunction, isSubclass };

function isUdf(a) { return typeof a === "undefined"; }

function isNumber(a) { return typeof a === "number" && !isNaN(a); }

function isType(a, type) { return typeof a === "object" && a.constructor === type; }

function isArray(a) { return isType(a, Array); }

function isFunction(a) { return typeof a === "function"; }

function isSubclass(a, b) { return isFunction(a) && a.prototype instanceof b; }
