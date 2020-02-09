
import { createSVG } from "../util/util";
import Anchor from "../vector/anchor";
import Box from "../vector/box";
import Tab from "../core/tab";

const CLASSES = {
	root: "node-editor-tab",
	search: "node-search",
	searchWrapper: "node-search__wrapper",
	searchWrapper2: "node-search__wrapper2",
	searchWrapper3: "node-search__wrapper3",
	nodeSpace: "node-space",
	innerNodeSpace: "node-space__inner",
	linksParent: "node-space__links-parent"
};

const SEARCH_ICON = "#icon-search";

export default class extends Tab {
	constructor() {
		super();
		this._createDOM();
	}

	static get tabName() {
		return "Node Editor";
	}

	get form() {
		return this._form;
	}

	get wrapper() {
		return this._wrapper;
	}

	get wrapper2() {
		return this._wrapper2;
	}

	get wrapper3() {
		return this._wrapper3;
	}

	get searchInput() {
		return this._searchInput;
	}

	get submitBtn() {
		return this._submitBtn;
	}

	get nodeSpace() {
		return this._nodeSpace;
	}

	get innerNodeSpace() {
		return this._innerNodeSpace;
	}

	get linksParent() {
		return this._linksParent;
	}

	_createDOM() {
		this._root.classList.add(CLASSES.root);
		this._anchor = new Anchor(this._root);

		const form = document.createElement("form");
		form.classList.add(CLASSES.search);
		this._root.appendChild(form);
		this._form = form;

		const w = document.createElement("div");
		w.classList.add(CLASSES.searchWrapper);
		form.appendChild(w);
		this._wrapper = w;

		const w2 = document.createElement("div");
		w2.classList.add(CLASSES.searchWrapper2);
		w.appendChild(w2);
		this._wrapper2 = w2;

		const w3 = document.createElement("div");
		w3.classList.add(CLASSES.searchWrapper3);
		w2.appendChild(w3);
		this._wrapper3 = w3;

		const input = document.createElement("input");
		input.type = "text";
		w3.appendChild(input);
		this._searchInput = input;

		const btn = document.createElement("button");
		btn.type = "submit";
		w3.appendChild(btn);
		this._submitBtn = btn;

		const svg = createSVG(SEARCH_ICON);
		btn.appendChild(svg);

		const ns = document.createElement("div");
		ns.tabIndex = "0";
		ns.classList.add(CLASSES.nodeSpace);
		this._nodeSpace = new Box(ns, this._anchor);
		this._nodeSpace.appendElement();

		const ins = document.createElement("div");
		ins.classList.add(CLASSES.innerNodeSpace);
		this._innerNodeSpace = new Box(ins, this._nodeSpace);
		this._innerNodeSpace.appendElement();

		const links = document.createElement("div");
		links.classList.add(CLASSES.linksParent);
		this._linksParent = new Box(links, this._innerNodeSpace);
		this._linksParent.appendElement();
	}
}
