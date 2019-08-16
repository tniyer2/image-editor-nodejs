
import { deepcopy } from "./utility";
import { Slider } from "./input";
import { ToolUI, EmptyToolUI } from "./toolUI";
import { Node, NodeInput, NodeOutput } from "./node";

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
			  ui = new EmptyToolUI();
		super([input], [output], ui, null, { icon: "#icon-test-node" });
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

const AsyncTestNode = (function(){
	const OPTIONS = { icon: "#icon-async-test-node" };
	const UI_OPTIONS = { delay: { value: 1 } };

	return class extends Node {
		constructor() {
			const input = new NodeInput(TestOutputType),
				  output = new NodeOutput(TestOutputType),
				  ui = new AsyncTestUI();
			super([input], [output], ui, deepcopy(UI_OPTIONS), OPTIONS);
		}

		_cook(a) {
			const delay = this.uiOptions.get("delay");
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
	};
})(); 

class AsyncTestUI extends ToolUI {
	_createUI() {
		const d = document.createElement("div");

		const delay = this.options.get("delay");
		const ds = new Slider(delay, 0, 5, { text: "delay", step: "0.5" });
		ds.onChange.addListener((val) => {
			this.options.tryPut("delay", val);
		});
		this.options.addListener("delay", (val) => {
			ds.value = val;
		});
		d.appendChild(ds.root);

		return d;
	}
}
