
import { Slider } from "../input/input";
import { Node, NodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "../core/node";

export { TestNode, AsyncTestNode };

class TestOutputType {
	constructor(val) {
		this.value = val;
	}

	static get pointColor() {
		return "grey";
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
	constructor() {
		super();
	}

	_initDOM() {
		this._createDOM();
		this._addListeners();
	}

	_createDOM() {
		const delay = this._settings.get("delay");
		const s = new Slider(delay, 0, 5, { text: "delay", step: "0.5" });
		this._root.appendChild(s.root);
		this._slider = s;
	}

	_addListeners() {
		this._slider.onChange.addListener((val) => {
			this._settings.tryPut("delay", val);
		});
		this._settings.addListener("delay", (val) => {
			this._slider.value = val;
		});
	}
}
