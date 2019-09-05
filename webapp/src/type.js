
export
	{ isUdf, isNumber, isObject,
	  isFunction, isType, isArray, isSubclass };

function isUdf(a) {
	return typeof a === "undefined";
}

function isNumber(a) {
	return typeof a === "number" && !isNaN(a);
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

function isArray(a) {
	return isType(a, Array);
}

function isSubclass(a, b) {
	return isFunction(a) && a.prototype instanceof b;
}
