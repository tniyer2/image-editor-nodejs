
import { isFunction, extend, addGetter } from "./utility";
import { Dictionary, EventDictionary } from "./dictionary";

export { OptionsDictionary, addOptions, addNamedOptions };

const OptionsDictionary = (function(){
	return class extends EventDictionary {
		constructor() {
			super();
		}

		set(...options) {
			for (let i = 0, l = options.length; i < l; i+=1) {
				const opt = options[i];
				if (opt instanceof Dictionary) {
					options[i] = opt.items;
				}
			}
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

function addNamedOptions(obj, name, ...options) {
	const dict = new OptionsDictionary();
	dict.set(...options);
	addGetter(obj, name, dict);	
}

function addOptions(obj, ...options) {
	addNamedOptions(obj, "options", ...options);
}
