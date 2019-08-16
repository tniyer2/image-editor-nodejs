
import { createSVG } from "./utility";
import { addEvent } from "./event";
import { Box } from "./geometry";

export { AreaWrapper, Area, Tab };

class Container {
	constructor() {
		const elm = document.createElement("div");
		this._box = new Box(elm);
		this.attached = false;
	}

	attach(box) {
		this._box.parent = box;
		this._box.appendDOM();
		this.attached = true;
	}

	detach() {
		if (!this._box.parent) return;

		this._box.removeDOM();
		this._box.parent = null;
		this.attached = false;
	}
}

const AreaWrapper = (function(){
	const CLASSES =
	{ root: "area-wrapper",
	  rows: "rows" };

	return class extends Container {
		constructor() {
			super();
			this._containers = [];
			this.rows = false;
			this._box.element.classList.add(CLASSES.root);
		}

		get rows() {
			return this._rows;
		}

		set rows(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}
			this._rows = val;
			this._box.element.classList.toggle(CLASSES.rows, val);
		}

		get containers() {
			return this._containers.splice();
		}

		add(container) {
			if (!(container instanceof Container)) {
				throw new Error("Invalid argument.");
			}
			container.attach(this._box);
			this._containers.push(container);
		}

		remove(container) {
			const i = this._containers.findIndex(c => c === container);
			if (i === -1) {
				throw new Error("Cannot find argument 'container' in this._containers");
			}

			const found = this._containers[i];
			found.detach();
			this._containers.splice(i, 1);
		}
	};
})();

const Area = (function(){
	const CLASSES =
	{ root: "area",
	  bar: "tab-bar",
	  topBar: "tab-bar-top",
	  tabs: "tabs",
	  bottomBar: "tab-bar-bottom",
	  addTab: "add-tab",
	  wrapper: "tab-parent" };
	const ADD_ICON = "#icon-plus";

	return class extends Container {
		constructor(tabFactory) {
			super();
			this._tabFactory = tabFactory;
			this._tabUIs = [];
			this._activeTabUI = null;

			this._createDOM();
			this._attachListeners();
		}

		_createDOM() {
			this._box.element.classList.add(CLASSES.root);

			const bar = document.createElement("div");
			bar.classList.add(CLASSES.bar);
			this._box.element.appendChild(bar);

			const topBar = document.createElement("div");
			topBar.classList.add(CLASSES.topBar);
			bar.appendChild(topBar);

			const tabs = document.createElement("div");
			tabs.classList.add(CLASSES.tabs);
			topBar.appendChild(tabs);
			this._tabUIParent = tabs;

			const addTab = document.createElement("div");
			addTab.classList.add(CLASSES.addTab);
			topBar.appendChild(addTab);

			const addBtn = document.createElement("button");
			addBtn.type = "button";
			addTab.appendChild(addBtn);
			this._addButton = addBtn;

			const addSvg = createSVG(ADD_ICON);
			addBtn.appendChild(addSvg);

			const bottomBar = document.createElement("div");
			bottomBar.classList.add(CLASSES.bottomBar);
			bar.appendChild(bottomBar);

			const w = document.createElement("div");
			w.classList.add(CLASSES.wrapper);
			this._tabParent = new Box(w, this._box);
			this._tabParent.appendDOM();
		}

		_attachListeners() {
			this._addButton.addEventListener("click", () => {
				this._addTab();
			});
		}

		_addTab(tabString=null) {
			const ui = new TabUI();
			ui.tab = this._tabManager.get(tabString);
			this._tabUIParent.appendChild(ui.root);
			this._tabUIs.push(ui);

			ui.onClick.addListener(() => {
				this._setActive(ui);
			});
			ui.onRemove.addListener(() => {
				this._removeTabUI(ui);
			});

			this._setActive(ui);
		}

		_removeTabUI(val) {
			if (!(val instanceof TabUI)) {
				throw new Error("Invalid argument.");
			}

			const i = this._tabUIs.findIndex(t => t === val);
			if (i === -1) {
				throw new Error("Cannot find argument 'val' in this._tabs");
			}

			this._tabUIParent.removeChild(val.root);
			if (val === this._activeTabUI) {
				this._setActive(null);
			}
			this._tabFactory.free(val.tab.tabString);
			this._tabUIs.splice(i, 1);
		}

		_setActive(val) {
			if (val !== null && !(val instanceof TabUI)) {
				throw new Error("Invalid argument.");
			}

			if (this._activeTabUI) {
				this._activeTabUI.active = false;
				const tab = this._activeTabUI.tab;
				if (tab) {
					tab.detach();
				}
			}

			if (val) {
				val.active = true;
				const tab = val.tab;
				if (tab) {
					tab.attach(this._tabParent);
				}
			}

			this._activeTabUI = val;
		}
	};
})();

const TabUI = (function(){
	const CLASSES =
	{ root: "tab",
	  active: "active",
	  text: "text",
	  remove: "remove-btn" };

	return class {
		constructor() {
			this._tab = null;
			this._active = false;

			addEvent(this, "onClick");
			addEvent(this, "onRemove");

			this._createDOM();
			this._attachListeners();
		}

		get tab() {
			return this._tab;
		}

		set tab(val) {
			if (!(val instanceof Tab)) {
				throw new Error("Invalid argument.");
			}
			if (this._tab) {
				this._tab.onRemove();
			}
			this._name.innerText = val.tabName || "";
			val.onAdd(this);
			this._tab = val;
		}

		get active() {
			return this._active;
		}

		set active(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}
			this.root.classList.toggle(CLASSES.active, val);
			this._active = val;
		}

		_createDOM() {
			const d = document.createElement("div");
			d.classList.add(CLASSES.root);
			this.root = d;

			const text = document.createElement("span");
			text.classList.add(CLASSES.text);
			d.appendChild(text);
			this._name = text;

			const remove = document.createElement("button");
			remove.type = "button";
			remove.innerText = "&times;";
			remove.classList.add(CLASSES.remove);
			d.appendChild(remove);
			this._removeBtn = remove;
		}

		_attachListeners() {
			this.root.addEventListener("click", () => {
				this._onClick.trigger();
			});
			this._removeBtn.addEventListener("click", () => {
				this._onRemove.trigger();
			});
		}
	};
})();

const Tab = (function(){
	const cl_root = "tab-wrapper";

	return class extends Container {
		constructor() {
			super();
			this._box.element.classList.add(cl_root);
		}

		onAdd(tabUI) {
			this._tabUI = tabUI;
		}

		onRemove() {}
	};
})();
