
import { addGetter } from "./utility";
import { addOptions } from "./options";

export { Listener, PromiseListener };

const Listener = (function(){
	const DEFAULTS = { minEvents: 0 };
	const invalidAttachMessage = "Cannot attach eventListener again until Promise is resolved or eventListener is removed.";

	return class {
		constructor(target, type, listener, options) {
			addGetter(this, "target", target);
			addGetter(this, "type", type);
			this._listener = listener;
			addOptions(this, DEFAULTS, options);

			addGetter(this, "attached", false);
		}

		attach() {
			if (this._attached) {
				console.warn(invalidAttachMessage);
			} else {
				const r = this._attach.apply(this, arguments);
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
			this._target.addEventListener(this._type, this._wrapper, 
										  this._options.get("eventOptions"));
		}

		remove() {
			if (this._attached) {
				this._remove();
				this._attached = false;
			}
		}

		_remove() {
			this._target.removeEventListener(this._type, this._wrapper, this._eventOptions);
		}

		_checkConditions() {
			if (this._count < this._options.get("minEvents")) {
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
			this._target.addEventListener(this._type, this._wrapper, this._options);
		});
	}

	_remove() {
		this._target.removeEventListener(this._type, this._wrapper, this._options);
		if (this._reject) {
			this._reject();
		}
	}
}
