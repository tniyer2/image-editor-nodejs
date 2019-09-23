
import { LayerGroup } from "./basicTypes";
import { Node, MultiNodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "./node";

const OPTIONS = { icon: "#icon-merge-node" };

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
		const l = groups.length;
		if (!l) {
			output = null;
		} else if (l === 1) {
			output = groups[0];
		} else {
			let layers = groups.map(g => g.layers);
			layers = [].concat(...layers);

			let cinfo = groups.map(g => g.canvasInfo).filter(Boolean);
			cinfo = cinfo.length ? cinfo[0] : null;

			output = new LayerGroup(layers, cinfo);
		}

		return [output];
	}
}
