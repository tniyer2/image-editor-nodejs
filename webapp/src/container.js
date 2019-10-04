
import { Box } from "./geometry";

export default class {
	constructor() {
		const elm = document.createElement("div");
		this._box = new Box(elm);
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

	addTo(box) {
		this._checkState();
		if (this._attached) {
			throw new Error("Invalid state. Container is attached.");
		}

		this._box.parent = box;
		this._box.appendElement();
		this._onAdd(box);

		this._attached = true;
	}

	remove() {
		this._checkState();
		if (!this._attached) {
			throw new Error("Invalid state. Container is not attached.");
		}

		this._onRemove();
		this._box.removeElement();
		this._box.parent = null;

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

	_onAdd(box) {}
	_onRemove() {}
	_onDispose() {}
}
