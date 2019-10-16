
import { isUdf, isType, isArray } from "../util/type";

class MyEventInterface {
	constructor(c) {
		this._common = c;
	}

	addListener(l) {
		this._common.queue.push(l);
	}

	removeListener(l) {
		const i = this._common.queue.findIndex(o => o === l);
		if (i === -1) return;

		this._common.queue.splice(i, 1);
	}
}

export default class MyEvent {
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
			if (!isArray(p)) {
				throw new Error("Argument 'getParams' did not return an Array");
			}
			f(...p);
		});
	}

	clear() {
		this._common.queue = [];
	}

	linkTo(a) {
		let n;
		if (isType(a, MyEventInterface)) {
			n = a;
		} else if (isType(a, MyEvent)) {
			n = a.interface;
		} else {
			throw new Error("Invalid argument.");
		}

		const l = (...args) => {
			this.trigger(...args);
		};
		n.addListener(l);

		return () => {
			n.removeListener(l);
		};
	}
}
