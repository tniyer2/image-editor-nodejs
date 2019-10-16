
import Listener from "./listener";

export default class EventPromise extends Listener {
	_attach() {
		return new Promise((resolve, reject) => {
			this._reject = reject;

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

			this._wrapper = (evt) => {
				if (this._checkConditions(evt)) {
					this._listener.call(this, evt, resolveWrapper, rejectWrapper);
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
