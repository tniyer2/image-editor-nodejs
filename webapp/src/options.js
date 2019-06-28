
import { isFunction, extend, addGetter } from "./utility";
import { EventDictionary } from "./dictionary";

export { OptionsDictionary, addOptions };

const OptionsDictionary = (function(){
	return class extends EventDictionary {
		constructor() {
			super();
		}

		set(...options) {
			const all = extend(...options);
			for (const key in all) {
				if (all.hasOwnProperty(key)) {
					this.put(key, all[key]);
				}
			}
		}

		get(name, evalFunctions=true) {
			const val = super.get(name);
			return evalFunctions && isFunction(val) ? val() : val;
		}

		addListener (name, listener) {
			if (name.constructor === Array) {
				name.forEach((n) => {
					super.addListener(n, listener);
				});
			} else {
				super.addListener(name, listener);
			}
		}

		removeListener (name, listener) {
			if (name.constructor === Array) {
				name.forEach((n) => {
					super.removeListener(n, listener);
				});
			} else {
				super.removeListener(name, listener);
			}
		}
	};
})(); 

function addOptions(obj, ...options) {
	const dict = new OptionsDictionary();
	dict.set(...options);
	addGetter(obj, "options", dict);
}
