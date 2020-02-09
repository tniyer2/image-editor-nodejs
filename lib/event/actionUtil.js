
import { isFunction, isArray } from "../util/type";
import { addEvent } from "./util";

export { ActionHandler, ActionPiper, ActionBridge };

function reduceEventNames(actions) {
	if (!isArray(actions)) {
		throw new Error("Invalid argument.");
	} else if (!actions.every(a =>
		isFunction(a) && isArray(a.eventNames))) {
		throw new Error("Invalid argument.");
	}

	return actions.reduce((acc, cur) => {
		return acc.concat(cur.eventNames);
	}, []);
}

class ActionHandler {
	constructor(actions) {
		this._eventNames = reduceEventNames(actions);
		this._listenerNames = this._eventNames.map(n => "_" + n);

		this._listenerNames.forEach((n) => {
			if (isFunction(this[n])) {
				this[n] = this[n].bind(this);
			}
		});
	}

	handle(action) {
		this._eventNames.forEach((e, i) => {
			const l = this._listenerNames[i];
			const f = this[l];
			if (f) {
				const a = action[e];
				if (a) {
					a.addListener(f);
				}
			}
		});
	}

	stopHandling(action) {
		this._eventNames.forEach((e, i) => {
			const l = this._listenerNames[i];
			const f = this[l];
			if (f) {
				action[e].removeListener(f);
			}
		});
	}
}

class ActionPiper {
	constructor(actions) {
		this._eventNames = reduceEventNames(actions);
		this._eventNames.forEach((name) => {
			addEvent(this, name);
		});

		this._actions = [];
		this._cleanUpFunctions = [];
	}

	pipe(action) {
		const arr = [];

		this._eventNames.forEach((n) => {
			const event = action[n];
			if (event) {
				const dispose = this["_" + n].linkTo(event);
				arr.push(dispose);
			}
		});

		this._actions.push(action);
		this._cleanUpFunctions.push(arr);
	}

	remove(action)  {
		const i = this._actions.findIndex(a => a === action);
		if (i === -1) {
			throw new Error("Could not find argument 'action' in this._actions");
		}

		this._cleanUpFunctions[i].forEach((f) => {
			f();
		});

		this._actions.splice(i, 1);
		this._cleanUpFunctions.splice(i, 1);
	}

	clear() {
		this._cleanUpFunctions.forEach((arr) => {
			arr.forEach((f) => {
				f();
			});
		});
		this._actions = [];
		this._cleanUpFunctions = [];
	}
}

class ActionBridge {
	constructor(actions) {
		this._eventNames = reduceEventNames(actions);
		this._eventNames.forEach((name) => {
			addEvent(this, name);
		});
	}

	triggerEvent(name, args) {
		if (!this._eventNames.includes(name)) {
			throw new Error("Invalid argument.");
		} else if (!isArray(args)) {
			throw new Error("Invalid argument.");
		}
		this["_" + name].trigger(...args);
	}
}
