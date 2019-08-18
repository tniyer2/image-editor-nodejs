
import { isFunction } from "./type";
import { extend } from "./utility";

export { Listener, PromiseListener };

const Listener = (function(){
	const DEFAULTS =
	{ eventOptions: false, 
	  minEvents: 0 };

	return class {
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

		attach(...args) {
			if (this._attached) {
				throw new Error("Invalid state. Listener is attached.");
			} else {
				const r = this._attach(...args);
				this._attached = true;
				return r;
			}
		}

		_attach() {
			this._count = 0;

			this._wrapper = (evt) => {
				if (this._checkConditions()) {
					this._listener(evt, this);
				}
			};
			this._target.addEventListener(
				this._type, this._wrapper, this._options.eventOptions);
		}

		remove(...args) {
			if (!this._attached) return;

			const r = this._remove(...args);
			this._attached = false;
			return r;
		}

		_remove() {
			this._target.removeEventListener(
				this._type, this._wrapper, this._options.eventOptions);
		}

		_checkConditions() {
			if (this._count < this._options.minEvents) {
				this._count += 1;
				return false;
			} else {
				this._count = 0;
			}

			return true;
		}
	};
})();

class PromiseListener extends Listener {
	_attach() {
		this._count = 0;

		return new Promise((resolve, reject) => {
			const resolveWrapper = (value) => {
				this._reject = null;
				this.remove();
				resolve(value);
			};
			const rejectWrapper = (reason) => {
				this._reject = null;
				this.remove();
				reject(reason);
			};
			this._reject = reject;
			this._wrapper = (evt) => {
				if (this._checkConditions()) {
					this._listener(evt, this, resolveWrapper, rejectWrapper);
				}
			};
			this._target.addEventListener(
				this._type, this._wrapper, this._options.eventOptions);
		});
	}

	_remove() {
		this._target.removeEventListener(
			this._type, this._wrapper, this._options.eventOptions);
		if (this._reject) {
			this._reject();
		}
	}
}
