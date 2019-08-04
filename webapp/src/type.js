
export { isUdf, isNumber, isType, isFunction };

function isUdf(a) { return typeof a === "undefined"; }

function isNumber(a) { return typeof a === "number" && !isNaN(a); }

function isType(a, type) { return typeof a === "object" && a.constructor === type; }

function isFunction(a) { return typeof a === "function"; }
