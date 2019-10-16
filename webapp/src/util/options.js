
import { isType } from "./type";
import { extend } from "./util";
import Dictionary from "./dictionary";
import EventDictionary from "./eventDictionary";

export default class extends EventDictionary {
	set(...options) {
		options = options.map(p =>
			p instanceof Dictionary ? p.items : p);

		const all = extend(...options);
		Object.keys(all).forEach((k) => {
			this.put(k, all[k]);
		});
	}

	addListener (name, listener) {
		if (isType(name, Array)) {
			name.forEach((n) => {
				super.addListener(n, listener);
			});
		} else if (typeof name === "string") {
			super.addListener(name, listener);
		} else {
			throw new Error("Invalid argument.");
		}
	}

	removeListener (name, listener) {
		if (isType(name, Array)) {
			name.forEach((n) => {
				super.removeListener(n, listener);
			});
		} else if (typeof name === "string") {
			super.removeListener(name, listener);
		} else {
			throw new Error("Invalid argument.");
		}
	}
} 
