
import { MessageBox } from "../input/input";
import Tab from "../core/tab";

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

	get root() {
		return this._root;
	}

	get messageBox() {
		return this._messageBox;
	}

	get wrapper() {
		return this._wrapper;
	}

	_createDOM() {
		this._root.classList.add(CLASSES.root);

		const m = new MessageBox();
		this._root.appendChild(m.root);
		this._messageBox = m;

		const w = document.createElement("div");
		w.classList.add(CLASSES.wrapper);
		this._root.appendChild(w);
		this._wrapper = w;
	}
}
