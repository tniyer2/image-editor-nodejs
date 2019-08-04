
import { Slider } from "./input";
import { Node, NodeInput, NodeOutput, NodeUI, EmptyNodeUI } from "./node";

export { TestNode, AsyncTestNode };

class TestOutputType {
	constructor(val) {
		this.value = val;
	}

	static get pointColor() {
		return "#0af";
	}

	copy() {
		return new TestOutputType(this.value);
	}
}

class TestNode extends Node {
	constructor() {
		const input = new NodeInput(TestOutputType),
			  output = new NodeOutput(TestOutputType),
			  ui = new EmptyNodeUI();
		super([input], [output], ui, { icon: "#icon-test-node" });
	}

	_cook(a) {
		if (a) {
			a.value += 1;
		} else {
			a = new TestOutputType(1);
		}
		return [a];
	}
}

class AsyncTestNode extends Node {
	constructor() {
		const input = new NodeInput(TestOutputType),
			  output = new NodeOutput(TestOutputType),
			  ui = new AsyncTestUI();
		super([input], [output], ui, { icon: "#icon-async-test-node" });
	}

	_cook(a) {
		const delay = this.ui.dictionary.get("delay");
		return new Promise((resolve) => {
			if (a) {
				a.value += 1;
			} else {
				a = new TestOutputType(1);
			}
			const o = [a];

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

			const delay = this.dictionary.get("delay");
			const ds = new Slider(delay, 0, 5, { text: "delay", step: "0.5" });
			ds.onChange.addListener((val) => {
				this.dictionary.put("delay", val);
			});
			this.dictionary.addListener("delay", (val) => {
				ds.value = val;
			});
			d.appendChild(ds.root);

			return d;
		}
	};
})();
