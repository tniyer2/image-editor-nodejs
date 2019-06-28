
import { addGetter } from "./utility";
export { Listener, PromiseListener };

const Listener = (function(){
	const invalidAttachMessage = "Cannot attach eventListener again until Promise is resolved or eventListener is removed.";

	return class {
		constructor(target, type, listener, options) {
			addGetter(this, "target", target);
			addGetter(this, "type", type);
			this._listener = listener;
			this._options = options;
			addGetter(this, "attached", false);
		}

		attach() {
			if (this._attached) {
				throw new Error(invalidAttachMessage);
			} else {
				let ret = this._attach.apply(this, arguments);
				this._attached = true;
				return ret;
			}
		}

		_attach() {
			this._wrapper = (evt) => {
				this._listener(evt, this);
			};
			this._target.addEventListener(this._type, this._wrapper, this._options);
		}

		remove() {
			if (this._attached) {
				this._remove();
				this._attached = false;
			}
		}

		_remove() {
			this._target.removeEventListener(this._type, this._wrapper, this._options);
		}
	};
})();

class PromiseListener extends Listener {
	_attach() {
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
				this._listener(evt, this, resolveWrapper, rejectWrapper);
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
