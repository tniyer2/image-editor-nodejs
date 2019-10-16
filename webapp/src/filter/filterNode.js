
import { Dropdown } from "../input/input";
import { Node, NodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "../core/node";

import CanvasLayer from "../layer/canvasLayer";
import LayerGroup from "../layer/layerGroup";

import Mask from "./mask";
import { Matrix, ColorMatrixFilter } from "./filters";

export default (function(){
	const SETTINGS = {};

	const OPTIONS = {
		icon: "#icon-filter-node"
	};

	return class extends Node {
		constructor() {
			const
				input1 = new NodeInput(LayerGroup),
				input2 = new NodeInput(Mask),
				output1 = new NodeOutput(LayerGroup),
				ui = new FilterNodeSettingsContainer(),
				settings = new NodeSettings(SETTINGS);

			super([input1, input2], [output1], ui, settings, OPTIONS);
		}

		_cook(inputs) {
			const group = inputs[0];
			if (!group || group.layers.length === 0) {
				return [group];
			}

			const filter = new ColorMatrixFilter(new Matrix(
				[1.2, -0.1, -0.1, 0,
				 -0.1, 1.2, -0.1, 0,
				 -0.1, -0.1, 1.2, 0,
				 0, 0, 0, 1]
					, 4, 4));

			const newLayers = group.layers.map((layer) => {
				if (layer instanceof CanvasLayer) {
					return this._getFilteredLayer(layer, filter);
				} else {
					return layer;
				}
			});

			const newGroup = new LayerGroup(newLayers, group.info);
			return [newGroup];
		}

		_getFilteredLayer(layer, filter) {
			const
				oldCanvas = layer.canvas,
				w = oldCanvas.width,
				h = oldCanvas.height;

			const newCanvas = document.createElement("canvas");
			newCanvas.width = w;
			newCanvas.height = h;

			const imageData =
				oldCanvas.getContext("2d").getImageData(0, 0, w, h);

			const newImageData = filter.applyFilter(imageData);

			newCanvas.getContext("2d").putImageData(newImageData, 0, 0);

			return new CanvasLayer(newCanvas, layer.box, layer.properties);
		}
	};
})();

const FilterNodeSettingsContainer = (function(){
	return class extends NodeSettingsContainer {
		constructor() {
			super();
		}

		_initDOM() {
			this._createDOM();
			this._addListeners();
		}

		_createDOM() {}

		_addListeners() {}
	};
})();
