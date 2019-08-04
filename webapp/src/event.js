
import { isUdf } from "./type";

export { MyEvent, addEvent };

const MyEvent = (function(){
	class MyEventInterface {
		constructor(c) {
			this._common = c;
		}

		addListener(l) {
			this._common.queue.push(l);
		}

		removeListener(l) {
			const queue = this._common.queue;
			const i = queue.findIndex(o => o === l);
			const found = i !== -1;
			if (found) {
				queue.splice(i, 1);	
			} else {
				console.warn("Could not find listener:", l);
			}
		}
	}
	
	return class {
		constructor() {
			this._common = Object.create(null);
			this._common.queue = [];
			this.interface = new MyEventInterface(this._common);
		}

		trigger(...args) {
			this._common.queue.forEach((f) => {
				f(...args);
			});
		}

		triggerWithParams(getParams) {
			this._common.queue.forEach((f) => {
				const p = getParams();
				if (typeof p !== "object" || p.constructor !== Array) {
					throw new Error("Callback return value must be an array:", p);
				}
				f(...p);
			});
		}

		clear() {
			this._common.queue = [];
		}

		linkTo(a) {
			let n, invalidArgument = false;
			if (!a || typeof a !== "object") {
				invalidArgument = true;
			} else if (a.constructor === MyEventInterface) {
				n = a;
			} else if (a.constructor === MyEvent) {
				n = a.interface;
			} else {
				invalidArgument = true;
			}

			if (invalidArgument) {
				throw new Error("Invalid argument:", a);
			}

			const l = (...args) => {
				this.trigger(...args);
			};
			n.addListener(l);
			return (function(){
				n.removeListener(l);
			}).bind(this);
		}
	};
})();

function addEvent(obj, pub, priv) {
	if (isUdf(priv)) {
		priv = "_" + pub;
	}

	const e = new MyEvent();
	obj[priv] = e;
	obj[pub] = e.interface;
}
