
import { Slider } from "./input";
import
	{ Node, NodeInput, NodeOutput,
		NodeSettingsContainer, NodeSettings }
			from "./node";

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

const TestNode = (function(){
	const OPTIONS = { icon: "#icon-test-node" };

	return class extends Node {
		constructor() {
			const input = new NodeInput(TestOutputType),
				  output = new NodeOutput(TestOutputType),
				  ui = new NodeSettingsContainer(),
				  settings = new NodeSettings();

			super([input], [output], ui, settings, OPTIONS);
		}

		_cook(inputs) {
			const a = inputs[0];
			const val = a ? a.value+1 : 1;
			const output = new TestOutputType(val);

			return [output];
		}
	};
})();

const AsyncTestNode = (function(){
	const OPTIONS = { icon: "#icon-async-test-node" };
	const SETTINGS = { delay: { value: 1 } };

	return class extends Node {
		constructor() {
			const input = new NodeInput(TestOutputType),
				  output = new NodeOutput(TestOutputType),
				  ui = new AsyncTestNodeSettings(),
				  settings = new NodeSettings(SETTINGS);

			super([input], [output], ui, settings, OPTIONS);
		}

		_cook(inputs) {
			return new Promise((resolve) => {
				const a = inputs[0];
				const val = a ? a.value+1 : 1;
				const output = new TestOutputType(val);
				const o = [output];

				const delay = this.settings.get("delay");
				setTimeout(() => {
					resolve(o);
				}, 1000 * delay);
			});
		}
	};
})(); 

class AsyncTestNodeSettings extends NodeSettingsContainer {
	_createDOM() {
		const delay = this.options.get("delay");
		const s = new Slider(delay, 0, 5, { text: "delay", step: "0.5" });

		s.onChange.addListener((val) => {
			this.options.tryPut("delay", val);
		});
		this.options.addListener("delay", (val) => {
			s.value = val;
		});

		this._box.element.appendChild(s.root);
	}

	_add(box) {
		if (!this._initialized) {
			this._createDOM();
			this._initialized = true;
		}
	}
}
