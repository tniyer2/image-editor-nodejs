
import { addGetterRaw, isFunction } from "./utility";

const abstractOnly = n => "Cannot instantiate abstract class" + (n ? " " + n : "."),
	  mustImplement = n => "Must implement function " + n,
	  notFunction = n => n + " is not a function.",
	  noOverride = n => "Cannot override function " + n;

export default class {
	constructor(type, instance, className) {
		this._type = type;
		this._instance = instance;
		this._className = className;
	}

	enforceAbstract() {
		if (this._instance.constructor === this._type) {
			throw new Error(abstractOnly(this._className));
		}
	}

	enforceFunctions(names) {
		names.forEach((name) => {
			if (!isFunction(this._instance[name])) {
				throw new Error(mustImplement(name));
			}
		});
	}

	preventOverride(names) {
		names.forEach((name) => {
			if (!isFunction(this._instance[name]) || !isFunction(this._type.prototype[name])) {
				throw new Error(notFunction(name));
			}
			if (this._instance[name] !== this._type.prototype[name]) {
				throw new Error(noOverride(name));
			}
		});
	}
}
