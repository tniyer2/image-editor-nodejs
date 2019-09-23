
import { Box } from "./geometry";
import { Tab } from "./area";
import { MessageBox } from "./input";

const CLASSES = {
	root: "node-settings-tab",
	wrapper: "wrapper"
};

export default class extends Tab {
	constructor() {
		super();
		this._createDOM();
	}

	static get tabName() {
		return "Node Settings";
	}

	get box() {
		return this._box;
	}

	_createDOM() {
		this._box.element.classList.add(CLASSES.root);

		const m = new MessageBox();
		this._box.element.appendChild(m.root);
		this.messageBox = m;

		const w = document.createElement("div");
		w.classList.add(CLASSES.wrapper);
		this.wrapper = new Box(w, this._box);
		this.wrapper.appendElement();
	}
}
