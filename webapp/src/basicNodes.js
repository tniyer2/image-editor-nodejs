
import { FileInput } from "./input";
import { LayerGroup, ImageLayer } from "./basicTypes";
import { Node, NodeInput, MultiNodeInput, 
		 NodeOutput, NodeUI, EmptyNodeUI } from "./node";

export { ImageNode, MergeNode };

class ImageNode extends Node {
	constructor() {
		const output = new NodeOutput(LayerGroup),
			  ui = new ImageNodeUI();
		super([], [output], ui, { icon: "#icon-image-node" });
	}

	_cook() {
		let output;
		const image = this.ui.dictionary.get("image");
		if (image) {
			const layer = new ImageLayer(image);
			const group = new LayerGroup([layer]);
			output = group;
		} else {
			output = null;
		}

		return [output];
	}
}

const ImageNodeUI = (function(){
	const OPTIONS = { image: null };

	return class extends NodeUI {
		constructor() {
			super(OPTIONS);
		}

		_createUI() {
			const d = document.createElement("div");

			const fi = new FileInput(
				{ text: "upload", accept: "image/png, image/jpeg" });
			fi.onChange.addListener((file) => {
				const url = URL.createObjectURL(file);
				const image = new Image();

				image.addEventListener("load", () => {
					this.dictionary.put("image", image);
				});
				image.addEventListener("error", () => {
					console.warn("Failed to load image from url:", url);
				});

				image.src = url;
			});
			d.appendChild(fi.root);

			return d;
		}
	};
})();

class MergeNode extends Node {
	constructor() {
		const input = new MultiNodeInput(LayerGroup),
			  output = new NodeOutput(LayerGroup),
			  ui = new EmptyNodeUI();
		super([input], [output], ui, { icon: "#icon-merge-node" });
	}

	_cook(groups) {
		return [groups ? groups[0] : null];
	}
}
