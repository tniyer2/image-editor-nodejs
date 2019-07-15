
const cl_element = "tool-options";

export default class ToolUI {
	_initialize() {
		const d = this._createUI();
		if (d instanceof HTMLElement) {
			d.classList.add(cl_element);
			this._element = d;
		} else {
			throw new Error("_createUI did not return an HTMLElement:", d);
		}
	}

	enable(parent) {
		if (!this._initialized) {
			this._initialize();
			this._initialized = true;
		}

		parent.appendChild(this._element);
	}

	disable() {
		this._element.remove();
	}
}
