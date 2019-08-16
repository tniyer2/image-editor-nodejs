
import { deepcopy } from "./utility";
import { FileInput } from "./input";
import { LayerGroup, ImageLayer } from "./basicTypes";
import { ToolUI, EmptyToolUI } from "./toolUI";
import { Node, NodeInput, MultiNodeInput, NodeOutput } from "./node";

export { ImageNode, MergeNode };

const ImageNode = (function(){
	const OPTIONS = { icon: "#icon-image-node" };
	const UI_OPTIONS = { image: { value: null, nostack: true } };

	return class extends Node {
		constructor() {
			const output = new NodeOutput(LayerGroup),
				  ui = new ImageNodeUI();
			super([], [output], ui, deepcopy(UI_OPTIONS), OPTIONS);
		}

		_cook() {
			let output;
			const image = this.uiOptions.get("image");
			if (image) {
				const layer = new ImageLayer(image);
				const group = new LayerGroup([layer]);
				output = group;
			} else {
				output = null;
			}

			return [output];
		}
	};
})();

class ImageNodeUI extends ToolUI {
	_createUI() {
		const d = document.createElement("div");

		const fi = new FileInput(
			{ text: "upload", accept: "image/png, image/jpeg" });
		fi.onChange.addListener((file) => {
			const url = URL.createObjectURL(file);
			const image = new Image();

			image.addEventListener("load", () => {
				this.options.tryPut("image", image);
			});
			image.addEventListener("error", () => {
				console.warn("Failed to load image from url:", url);
			});

			image.src = url;
		});
		d.appendChild(fi.root);

		return d;
	}
}

const MergeNode = (function(){
	const OPTIONS = { icon: "#icon-merge-node" };

	return class extends Node {
		constructor() {
			const input = new MultiNodeInput(LayerGroup),
				  output = new NodeOutput(LayerGroup),
				  ui = new EmptyToolUI();
			super([input], [output], ui, null, OPTIONS);
		}

		_cook(groups) {
			groups = groups.filter(Boolean);

			let o_group;
			if (!groups.length) {
				o_group = null;
			} else if (groups.length === 1) {
				o_group = groups[0];
			} else {
				let layers = groups.map(g => g.layers);
				layers = [].concat(...layers);

				let cinfo = groups.map(g => g.canvasInfo).filter(Boolean);
				cinfo = cinfo.length ? cinfo[0] : null;

				o_group = new LayerGroup(layers, cinfo);
			}

			return [o_group];
		}
	};
})();
