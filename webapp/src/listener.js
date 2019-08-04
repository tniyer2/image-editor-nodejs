
import { addOptions } from "./options";

export { Listener, PromiseListener };

const Listener = (function(){
	const DEFAULTS = { minEvents: 0 };
	const invalidAttachMessage = "Cannot attach eventListener again until Promise is resolved or eventListener is removed.";

	return class {
		constructor(target, type, listener, options) {
			this.target = target;
			this.type = type;
			this._listener = listener;
			addOptions(this, DEFAULTS, options);

			this._eventOptions = this.options.get("eventOptions");

			this.attached = false;
		}

		attach() {
			if (this.attached) {
				console.warn(invalidAttachMessage);
			} else {
				const r = this._attach.apply(this, arguments);
				this.attached = true;
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
			this.target.addEventListener(
				this.type, this._wrapper, this._eventOptions);
		}

		remove() {
			if (this.attached) {
				this._remove();
				this.attached = false;
			}
		}

		_remove() {
			this.target.removeEventListener(
				this.type, this._wrapper, this._eventOptions);
		}

		_checkConditions() {
			if (this._count < this.options.get("minEvents")) {
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
			this.target.addEventListener(
				this.type, this._wrapper, this._eventOptions);
		});
	}

	_remove() {
		this.target.removeEventListener(
			this.type, this._wrapper, this._eventOptions);
		if (this._reject) {
			this._reject();
		}
	}
}
