
export default class {
	constructor() {
		this._root = document.createElement("div");
		this._attached = false;
		this._disposed = false;
	}

	get attached() {
		return this._attached;
	}

	get disposed() {
		return this._disposed;
	}

	_checkState() {
		if (this._disposed) {
			throw new Error("Invalid state. Container is disposed.");
		}
	}

	addTo(elm) {
		this._checkState();
		if (this._attached) {
			throw new Error("Invalid state. Container is attached.");
		}

		elm.appendChild(this._root);
		this._onAdd(elm);

		this._attached = true;
	}

	remove() {
		this._checkState();
		if (!this._attached) {
			throw new Error("Invalid state. Container is not attached.");
		}

		this._onRemove();
		this._root.remove();

		this._attached = false;
	}

	dispose() {
		this._checkState();
		if (this._attached) {
			throw new Error("Invalid state. Container is attached.");
		}

		this._onDispose();

		this._disposed = true;
	}

	_onAdd(elm) {}
	_onRemove() {}
	_onDispose() {}
}
