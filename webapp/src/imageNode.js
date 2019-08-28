
import { FileInput } from "./input";
import { LayerGroup, Layer } from "./basicTypes";
import
	{ Node, NodeOutput, NodeSettingsContainer, NodeSettings }
		from "./node";

const OPTIONS = { icon: "#icon-image-node" };
const SETTINGS = { image: { value: null, nostack: true } };

export default class extends Node {
	constructor() {
		const output = new NodeOutput(LayerGroup),
			  ui = new Settings(),
			  settings = new NodeSettings(SETTINGS);

		super([], [output], ui, settings, OPTIONS);
	}

	_cook(inputs) {
		let output;
		const image = this.settings.get("image");
		if (image) {
			const layer = new Layer(image);
			output = new LayerGroup([layer]);
		} else {
			output = null;
		}

		return [output];
	}
}

class Settings extends NodeSettingsContainer {
	_createDOM() {
		const f = new FileInput(
			{ text: "upload",
			  accept: "image/png, image/jpeg" });

		f.onChange.addListener((file) => {
			const url = URL.createObjectURL(file);
			const image = document.createElement("img");

			image.addEventListener("load", () => {
				this.options.tryPut("image", image);
			});
			image.addEventListener("error", () => {
				console.warn("Failed to load image from url:", url);
			});

			image.src = url;
		});
		this._box.element.appendChild(f.root);
	}

	_add(box) {
		if (!this._initialized) {
			this._createDOM();
			this._initialized = true;
		}
	}
}
