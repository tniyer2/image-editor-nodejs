
import { isUdf } from "./utility";
import { Slider } from "./input";
import { Node, NodeInput, NodeOutput, NodeUI, EmptyNodeUI } from "./node";

export { TestNode, AsyncTestNode };

class TestNode extends Node {
	constructor() {
		const input = new NodeInput(),
			  output = new NodeOutput(),
			  ui = new EmptyNodeUI();
		super([input], [output], ui, { icon: "#icon-test-node" });
	}

	_cook(a) {
		return isUdf(a) || a === null ? [1] : [a+1];
	}
}

class AsyncTestNode extends Node {
	constructor() {
		const input = new NodeInput(),
			  output = new NodeOutput(),
			  ui = new AsyncTestUI();
		super([input], [output], ui, { icon: "#icon-async-test-node" });
	}

	_cook(a) {
		const delay = this._ui.dictionary.get("delay");
		return new Promise((resolve) => {
			const o = isUdf(a) || a === null ? [1] : [a+1];

			setTimeout(() => {
				resolve(o);
			}, 1000 * delay);
		});
	}
}

const AsyncTestUI = (function(){
	const OPTIONS = { delay: 1 };

	return class extends NodeUI {
		constructor() {
			super(OPTIONS);
		}

		_createUI() {
			const d = document.createElement("div");

			const delay = this._dictionary.get("delay");
			const ds = new Slider(delay, 0, 5, { text: "delay", step: "0.5" });
			ds.onChange.addListener((val) => {
				this._dictionary.put("delay", val);
			});
			d.appendChild(ds.root);

			return d;
		}
	};
})();
