
import { isNumber } from "../util/type";
import Vector2 from "../vector/vector2";

export { createVectorProperty,
		 splitVectorProperty,
		 mouseEventToPoint };

function createVectorProperty(
	obj, vectorName, xName, yName, get=true, set=true) {

	const info = {};

	if (get === true) {
		info.get = function() {
			return new Vector2(this[xName], this[yName]);
		};
	}
	if (set === true) {
		info.set = function(val) {
			if (!(val instanceof Vector2)) {
				throw new Error("Invalid argument.");
			}
			this[xName] = val.x;
			this[yName] = val.y;
		};
	}

	Object.defineProperty(obj, vectorName, info);
}

function splitVectorProperty(
	obj, vectorName, xName, yName, get=true, set=true) {

	const xInfo = {},
		  yInfo = {};

	if (get === true) {
		xInfo.get = function() {
			return this[vectorName].x;
		};
		yInfo.get = function() {
			return this[vectorName].y;
		};
	}
	if (set === true) {
		xInfo.set = function(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this[vectorName] = new Vector2(val, this[vectorName].y);
		};
		yInfo.set = function(val) {
			if (!isNumber(val)) {
				throw new Error("Invalid argument.");
			}
			this[vectorName] = new Vector2(this[vectorName].x, val);
		};
	}

	Object.defineProperty(obj, xName, xInfo);
	Object.defineProperty(obj, yName, yInfo);
}

function mouseEventToPoint(evt) {
	if (!(evt instanceof MouseEvent)) {
		throw new Error("Invalid argument.");
	}
	return new Vector2(evt.clientX, evt.clientY);
}
