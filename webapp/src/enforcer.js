
import { isFunction } from "./utility";

const abstractOnly = n => "Cannot instantiate abstract class" + (n ? " " + n : "."),
	  mustImplement = n => "Must implement function " + n,
	  noOverride = n => "Cannot override function " + n,
	  cannotBind = n => "Cannot bind function " + n;

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
			if (this._instance[name] !== this._type.prototype[name]) {
				throw new Error(noOverride(name));
			}
		});
	}

	bindFunctions(names) {
		names.forEach((name) => {
			const f = this._instance[name];
			if (!isFunction(f)) {
				throw new Error(cannotBind(name));
			}
			this._instance[name] = f.bind(this._instance);
		});
	}
}
