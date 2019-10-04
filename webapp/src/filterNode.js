
import { CanvasLayer, LayerGroup } from "./layer";
import Mask from "./mask";
import { Node, NodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "./node";
import { Dropdown } from "./input";

export default (function(){
	const SETTINGS = {
		filterName: { value: "test2" }
	};

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

			const
				filterName = this.settings.get("filterName"),
				filter = this.manager.editor.filters.get(filterName);

			const newLayers = group.layers.map((layer) => {
				if (layer instanceof CanvasLayer) {
					return this._getFilteredLayer(layer, filter);
				} else {
					return layer;
				}
			});

			const newGroup = new LayerGroup(newLayers, group.canvasInfo);
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

			const
				context = oldCanvas.getContext("2d"),
				imageData = context.getImageData(0, 0, w, h);

			const
				newImageData = filter.applyFilter(imageData),
				newContext = newCanvas.getContext("2d");

			newContext.putImageData(newImageData, 0, 0);

			return new CanvasLayer(newCanvas, layer.box);
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

		_createDOM() {

		}

		_addListeners() {

		}
	};
})();
