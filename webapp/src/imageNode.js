
import { FileInput } from "./input";
import { LayerGroup, CanvasLayer } from "./layer";
import { Node, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "./node";

const OPTIONS = { icon: "#icon-image-node" };
const SETTINGS = { image: { value: null, nostack: true } };

export default class extends Node {
	constructor() {
		const output = new NodeOutput(LayerGroup),
			  ui = new ImageNodeSettingsContainer(),
			  settings = new NodeSettings(SETTINGS);

		super([], [output], ui, settings, OPTIONS);
	}

	_cook(inputs) {
		let output;
		const image = this.settings.get("image");
		if (image) {
			const layer = new CanvasLayer(image);
			output = new LayerGroup([layer]);
		} else {
			output = null;
		}

		return [output];
	}
}

class ImageNodeSettingsContainer extends NodeSettingsContainer {
	constructor() {
		super();

		this._createDOM();
		this._addListener();
	}

	_createDOM() {
		const f = new FileInput(
			{ text: "upload",
			  accept: "image/png, image/jpeg" });
		this._box.element.appendChild(f.root);
		this._fileInput = f;
	}

	_addListener() {
		this._fileInput.onChange.addListener((file) => {
			const url = URL.createObjectURL(file);
			const image = document.createElement("img");

			image.addEventListener("load", () => {
				this._settings.tryPut("image", image);
			});
			image.addEventListener("error", () => {
				throw new Error("Failed to load image from url: " + url);
			});

			image.src = url;
		});
	}
}
