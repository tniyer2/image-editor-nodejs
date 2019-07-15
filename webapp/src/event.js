
import { isUdf, removeItem, addGetter } from "./utility";

export { MyEvent, addEvent };

const MyEvent = (function(){
	class MyEventInterface {
		constructor(queue) {
			this._queue = queue;
		}

		addListener(l) {
			this._queue.push(l);
		}

		removeListener(l) {
			removeItem(this._queue, l);
		}
	}
	
	return class {
		constructor() {
			this._queue = [];
			let int = new MyEventInterface(this._queue);
			addGetter(this, "interface", int);
		}

		trigger() {
			this._queue.forEach((f) => {
				f.apply(null, arguments);
			});
		}

		triggerWithParams(getParams) {
			this._queue.forEach((f) => {
				const p = getParams();
				if (typeof p !== "object" || p.constructor !== Array) {
					throw new Error("Callback return value must be an array:", p);
				}
				f.apply(null, p);
			});
		}

		clear() {
			this._queue.splice(0, this._queue.length);
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
			return () => {
				n.removeListener(l);
			};
		}
	};
})();

function addEvent(obj, publicName, privateName) {
	if (isUdf(privateName)) {
		privateName = "_" + publicName;
	}

	obj[privateName] = new MyEvent();
	Object.defineProperty(obj, publicName, {
		get: () => obj[privateName].interface
	});
}
