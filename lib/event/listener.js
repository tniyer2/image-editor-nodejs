
import { isFunction } from "../util/type";
import { extend } from "../util/util";

const DEFAULTS = {
	eventOptions: false,
	minEvents: 0,
	condition: null
};

export default class Listener {
	constructor(target, type, listener, options) {
		if (!(target instanceof EventTarget)) {
			throw new Error("Invalid argument.");
		} else if (typeof type !== "string") {
			throw new Error("Invalid argument.");
		} else if (!isFunction(listener)) {
			throw new Error("Invalid argument.");
		}

		this._target = target;
		this._type = type;
		this._listener = listener;
		this._options = extend(DEFAULTS, options);

		this._attached = false;
	}

	get target() {
		return this._target;
	}

	get type() {
		return this._type;
	}

	get attached() {
		return this._attached;
	}

	attach() {
		if (this._attached) {
			throw new Error("Invalid state. Listener is attached.");
		}

		this._count = 0;
		const r = this._attach();
		this._attached = true;

		return r;
	}

	_attach() {
		this._wrapper = (evt) => {
			if (this._checkConditions(evt)) {
				this._listener.call(this, evt);
			}
		};

		this._target.addEventListener(
			this._type, this._wrapper, this._options.eventOptions);
	}

	remove() {
		if (!this._attached) return;

		this._remove();
		this._attached = false;
	}

	_remove() {
		this._target.removeEventListener(
			this._type, this._wrapper, this._options.eventOptions);
	}

	_checkConditions(evt) {
		if (this._count < this._options.minEvents) {
			this._count += 1;
			return false;
		} else {
			this._count = 0;
		}

		const f = this._options.condition;
		if (f && !f(evt)) {
			return false;
		}

		return true;
	}
}
