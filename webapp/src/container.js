
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

	_attach(box) {
		this._box.parent = box;
		this._box.appendElement();
	}

	_detach() {
		this._box.removeElement();
		this._box.parent = null;
	}

	_checkState() {
		if (this._disposed) {
			throw new Error("Invalid state. Container is disposed.");
		}
	}

	add(box) {
		this._checkState();
		if (this._attached) {
			throw new Error("Invalid state. Container is attached.");
		}

		this._attach(box);
		this._add(box);

		this._attached = true;
	}

	remove() {
		this._checkState();
		if (!this._attached) {
			throw new Error("Invalid state. Container is not attached.");
		}

		this._detach();
		this._remove();

		this._attached = false;
	}

	dispose() {
		this._checkState();
		if (this._attached) {
			throw new Error("Invalid state. Container is attached.");
		}

		this._dispose();

		this._disposed = true;
	}

	_add(box) {}
	_remove() {}
	_dispose() {}
}
