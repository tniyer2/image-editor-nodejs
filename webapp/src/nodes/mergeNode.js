
import { Node, MultiNodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "../core/node";
import LayerGroup from "../layer/layerGroup";

const OPTIONS = {
	icon: "#icon-merge-node"
};

export default class extends Node {
	constructor() {
		const input = new MultiNodeInput(LayerGroup),
			  output = new NodeOutput(LayerGroup),
			  ui = new NodeSettingsContainer(),
			  settings = new NodeSettings();

		super([input], [output], ui, settings, OPTIONS);
	}

	_cook(inputs) {
		let groups = inputs[0];
		groups = groups.filter(Boolean);

		let output;
		const len = groups.length;
		if (!len) {
			output = null;
		} else if (len === 1) {
			output = groups[0];
		} else {
			let layers = groups.map(g => g.layers);
			layers = [].concat(...layers);

			// clone copies
			layers = layers.map((l, i) => {
				if (layers.indexOf(l) === i) {
					return l;
				} else {
					return l.deepcopy();
				}
			});

			output = new LayerGroup(layers, groups[0].info);
		}

		return [output];
	}
}
