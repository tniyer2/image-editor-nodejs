
export { ToolUI, EmptyToolUI };

const ToolUI = (function(){
	const cl_element = "options-ui";

	return class {
		_initialize() {
			const d = this._createUI();
			if (d instanceof HTMLElement) {
				d.classList.add(cl_element);
				this._element = d;
			} else {
				throw new Error("_createUI did not return an HTMLElement:" + d);
			}
		}

		enable(parent) {
			if (!this._initialized) {
				try {
					this._initialize();
				} catch (e) {
					console.error(e);
					return;
				}
				this._initialized = true;
			}

			parent.appendChild(this._element);
		}

		disable() {
			this._element.remove();
		}
	};
})();

class EmptyToolUI extends ToolUI {
	_createUI() {
		return document.createElement("div");
	}
}
