
export { isUdf, isUdfOrNull, isNumber, isObject,
		 isFunction, isType, isObjectLiteral,
		 isArray, isSubclass };

function isUdf(a) {
	return typeof a === "undefined";
}

function isUdfOrNull(a) {
	return typeof a === "undefined" || a === null;
}

function isNumber(a) {
	return typeof a === "number" && !isNaN(a) && a !== Infinity;
}

function isObject(a) {
	return a !== null && typeof a === "object";
}

function isFunction(a) {
	return typeof a === "function";
}

function isType(a, type) {
	return isObject(a) && a.constructor === type;
}

function isObjectLiteral(a) {
	return isType(a, Object);
}

function isArray(a) {
	return isType(a, Array);
}

function isSubclass(a, b) {
	return isFunction(a) && a.prototype instanceof b;
}
