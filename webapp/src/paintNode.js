
import { isType } from "./type";
import { Vector2 } from "./geometry";
import { CanvasLayer, LayerGroup } from "./layer";
import { UserActionPiper } from "./action";
import Brush from "./brush";
import DefaultBrush from "./defaultBrush";
import { Node, NodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "./node";
import { NumericalInput, UnorderedList } from "./input";

export default (function(){
	const OPTIONS = {
		icon: "#icon-paint-node"
	};

	const SETTINGS = {
		strokes: { array: true },
		width: { value: 100 },
		height: { value: 100 }
	};

	return class extends Node {
		constructor() {
			const i1 = new NodeInput(LayerGroup),
				  i2 = new NodeInput(Brush),
				  o1 = new NodeOutput(LayerGroup),
				  ui = new PaintNodeSettingsContainer(),
				  settings = new NodeSettings(SETTINGS);

			super([i1, i2], [o1], ui, settings, OPTIONS);

			this._canvas = document.createElement("canvas");
			this._canvas.width = this.settings.get("width");
			this._canvas.height = this.settings.get("height");

			this._layer = null;
			this._layerGroup = null;

			this._defaultBrush = new DefaultBrush();

			this._layerAction = new UserActionPiper();
		}

		get toolType() {
			return "PaintTool";
		}

		get layer() {
			return this._layer;
		}

		get layerAction() {
			return this._layerAction;
		}

		get brush() {
			return this.inputs[1].value || this._defaultBrush;
		}

		_resetCanvas() {
			const ctx = this._canvas.getContext("2d");
			ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		}

		_cook(inputs) {
			const group = inputs[0];

			let newDimensions = false;

			if (group && this._dirtyInputs.includes(0) &&
				!this.settings.get("strokes").length) {

				const w = group.canvasInfo.width,
					  h = group.canvasInfo.height;
				this.settings.put("width", w);
				this.settings.put("height", h);
				this._canvas.width = w;
				this._canvas.height = h;
				newDimensions = true;
			}

			if (this._dirtySettings.includes("width")) {
				this._canvas.width = this.settings.get("width");
				newDimensions = true;
			}
			if (this._dirtySettings.includes("height")) {
				this._canvas.height = this.settings.get("height");
				newDimensions = true;
			}

			let newLayer = !this._layer || newDimensions;
			if (newLayer) {
				this._layer = new CanvasLayer(this._canvas);
				this.manager.editor.initLayer(this._layer);
				this._layerAction.clear();
				this._layerAction.pipe(this._layer.action);
			}

			if (newLayer || !this._layerGroup ||
				this._dirtyInputs.includes(0)) {
				if (group) {
					const layers = group.layers,
						  info = group.canvasInfo;
					layers.push(this._layer);
					this._layerGroup = new LayerGroup(layers, info);
				} else {
					this._layerGroup = new LayerGroup([this._layer]);
				}
			}

			if (this._dirtyInputs.includes(1) ||
				this._dirtySettings.includes("strokes")) {
				this._resetCanvas();
				this._applyStrokes();
			}

			return [this._layerGroup];
		}

		_applyStrokes() {
			const strokes = this.settings.get("strokes"),
				  brush = this.brush;

			strokes.forEach((stroke) => {
				const settings = stroke.settings.items();
				brush.paint(this._canvas, stroke.points, settings);
			});
		}
	};
})();

const PaintNodeSettingsContainer = (function(){
	const STROKE_SETTINGS = {
		strokeWidth: { value: 10 }
	};

	const CLASSES = {
		root: "paint-node-settings",
		strokeList: "stroke-list"
	};

	return class extends NodeSettingsContainer {
		constructor() {
			super();

			this._defaultStrokeSettings =
				new NodeSettings(STROKE_SETTINGS);
			this._currentStrokeSettings = null;

			this._strokeBuilder = () => {
				const defaults = this._defaultStrokeSettings.attributes();
				const stroke = new Stroke(defaults);
				stroke.settings.linkTo(this._settings);
				return stroke;
			};
		}

		get settings() {
			return super.settings;
		}

		set settings(val) {
			super.settings = val;
			this._settings.setBuilder(
				"strokes", this._strokeBuilder);
			this._defaultStrokeSettings.linkTo(this._settings);
		}

		_initDOM() {
			this._createDOM();
			this._addListeners();
			this._connectStrokeSettings(this._defaultStrokeSettings);
		}

		_createDOM() {
			this._box.element.classList.add(CLASSES.root);

			this._strokeList = new UnorderedList();
			this._strokeList.root.classList.add(CLASSES.strokeList);
			this._box.element.appendChild(this._strokeList.root);

			const bounds = document;

			this._widthInput = new NumericalInput(
				{ text: "Width", bounds: bounds });
			this._widthInput.value =
				this._settings.get("width");
			this._box.element.appendChild(this._widthInput.root);

			this._heightInput = new NumericalInput(
				{ text: "Height", bounds: bounds });
			this._heightInput.value =
				this._settings.get("height");
			this._box.element.appendChild(this._heightInput.root);

			this._strokeWidthInput = new NumericalInput(
				{ text: "Stroke Width", bounds: bounds });
			this._strokeWidthInput.value =
				this._defaultStrokeSettings.get("strokeWidth");
			this._box.element.appendChild(this._strokeWidthInput.root);
		}

		_addListeners() {
			this._strokeList.onRequestRemove((element, s) => {
				this._settings.tryPush("strokes", s, false);
			});

			this._settings.addListener("strokes", (s, adding) => {
				if (adding) {
					this._strokeList.add(s.root, s);
				} else {
					this._strokeList.remove(s.root);
				}
			});

			this._widthInput.onChange.addListener((val) => {
				this._settings.tryPut("width", val);
			});
			this._settings.addListener("width", (val) => {
				this._widthInput.value = val;
			});

			this._heightInput.onChange.addListener((val) => {
				this._settings.tryPut("height", val);
			});
			this._settings.addListener("height", (val) => {
				this._heightInput.value = val;
			});
		}

		_connectStrokeSettings(settings) {
			if (this._disconnect) {
				this._disconnect();
			}

			this._currentStrokeSettings = settings;

			const width = settings.get("strokeWidth");
			this._strokeWidthInput.value = width;
			const l1 = (val) => {
				this._strokeWidthInput.value = val;
			};
			const l2 = (val) => {
				settings.tryPut("strokeWidth", val);
			};
			settings.addListener("strokeWidth", l1);
			this._strokeWidthInput.onChange.addListener(l2);
			settings.addListener("strokeWidth", (val) => {
				if (settings !== this._currentStrokeSettings) {
					this._connectStrokeSettings(settings);
				}
			});

			this._disconnect = () => {
				this._currentStrokeSettings = null;

				settings.removeListener("strokeWidth", l1);
				this._strokeWidthInput.onChange.removeListener(l2);
			};
		}
	};
})();

const Stroke = (function(){
	const CLASSES = {
		root: "stroke"
	};

	return class {
		constructor(settings) {
			this._settings = new NodeSettings(settings);
			this._points = [];
			this._createDOM();
		}

		get settings() {
			return this._settings;
		}

		get points() {
			return this._points.slice();
		}

		addPoint(point) {
			if (!isType(point, Vector2)) {
				throw new Error("Invalid argument.");
			}
			this._points.push(point);
		}

		_createDOM() {
			this.root = document.createElement("div");
			this.root.classList.add(CLASSES.root);
		}
	};
})();
