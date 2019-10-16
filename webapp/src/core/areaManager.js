
import { isSubclass } from "../util/type";
import { createSVG } from "../util/util";
import ConstantDictionary from "../util/constantDictionary";
import { addEvent } from "../event/util";
import Listener from "../event/listener";
import { FloatingList } from "../input/input";
import Container from "./container";
import Tab from "./tab";

export default class {
	constructor(root) {
		if (!(root instanceof HTMLElement)) {
			throw new Error("Invalid argument.");
		}

		this.root = new AreaWrapper();
		this.root.addTo(root);

		this.tabs = new TabManager();
	}

	createArea() {
		return new Area(this.tabs);
	}

	createAreaWrapper() {
		return new AreaWrapper();
	}
}

class TabManager {
	constructor() {
		this._dictionary = new ConstantDictionary();
		this._array = [];
		addEvent(this, "onChange");
	}

	get freeTabs() {
		return this._array.filter(p => !p.single || p.free)
			.map(o => Object.assign({}, o));
	}

	_checkValidKey(key, checkHas) {
		if (typeof key !== "string" || !key.length) {
			throw new Error("Invalid argument.");
		} else if (checkHas && !this._dictionary.has(key)) {
			throw new Error("'" + key + "' is not a registered tab.");
		}
	}

	register(key, tabType, multiple=false) {
		this._checkValidKey(key, false);
		if (!isSubclass(tabType, Tab)) {
			throw new Error("Invalid argument.");
		} else if (typeof multiple !== "boolean") {
			throw new Error("Invalid argument.");
		}

		const info =
		{ key: key,
		  type: tabType,
		  single: !multiple };
		if (!multiple) {
			info.instance = new tabType();
			info.instance.tabKey = key;
			info.free = true;
		}

		this._dictionary.put(key, info);
		this._array.push(info);
		this._onChange.trigger();
	}

	get(key) {
		this._checkValidKey(key, true);

		const info = this._dictionary.get(key);
		if (info.single) {
			return info.instance;
		} else {
			throw new Error("'" + key + "' is registered as multiple and does not have an instance.");
		}
	}

	use(key) {
		this._checkValidKey(key, true);

		const info = this._dictionary.get(key);
		if (info.single) {
			if (!info.free) {
				throw new Error("Cannot access tab in use.");
			}

			info.free = false;
			this._onChange.trigger();

			return info.instance;
		} else {
			const tab = new info.type();
			tab.tabKey = info.key;
			return tab;
		}
	}

	free(key) {
		this._checkValidKey(key, true);

		const info = this._dictionary.get(key);
		if (!info.single) {
			return;
		} else if (info.free) {
			throw new Error("Tab is already free.");
		}

		info.free = true;
		this._onChange.trigger();
	}
}

const AreaWrapper = (function(){
	const CLASSES = {
		root: "area-wrapper",
	 	columns: "columns"
	 };

	return class extends Container {
		constructor() {
			super();

			this._children = [];
			this._columns = false;

			this._root.classList.add(CLASSES.root);
		}

		get columns() {
			return this._columns;
		}

		set columns(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}
			this._root.classList.toggle(CLASSES.columns, val);
			this._columns = val;
		}

		get children() {
			return this._children.splice();
		}

		addContainer(container) {
			if (!(container instanceof Area) &&
				!(container instanceof AreaWrapper)) {
				throw new Error("Invalid argument.");
			}

			container.addTo(this._root);
			this._children.push(container);
		}

		removeContainer(container) {
			const i = this._children.indexOf(container);
			if (i === -1) {
				throw new Error("Cannot find argument 'container'");
			}

			container.remove();
			this._children.splice(i, 1);
		}

		_onDispose() {
			this._children.forEach((child) => {
				child.remove();
				child.dispose();
			});
			this._children = [];
		}
	};
})();

const Area = (function(){
	const CLASSES = {
		root: "area",
		bar: "tab-bar",
		topBar: "tab-bar-top",
		tabs: "tabs",
		bottomBar: "tab-bar-bottom",
		addTab: "add-tab",
		tabMenu: "tab-menu",
		wrapper: "tab-parent"
	};

	const ADD_ICON = "#icon-plus";

	return class extends Container {
		constructor(tabManager) {
			super();

			this._tabManager = tabManager;
			this._tabUIs = [];
			this._activeTabUI = null;
			this._tabUICount = 0;

			this._createDOM();
			this._createListeners();
		}

		_createDOM() {
			this._root.classList.add(CLASSES.root);

			const bar = document.createElement("div");
			bar.classList.add(CLASSES.bar);
			this._root.appendChild(bar);

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
			this._addBtn = addBtn;

			const addSvg = createSVG(ADD_ICON);
			addBtn.appendChild(addSvg);

			this._tabMenu = new FloatingList();
			this._tabMenu.root.classList.add(CLASSES.tabMenu);
			addTab.appendChild(this._tabMenu.root);

			const bottomBar = document.createElement("div");
			bottomBar.classList.add(CLASSES.bottomBar);
			bar.appendChild(bottomBar);

			const w = document.createElement("div");
			w.classList.add(CLASSES.wrapper);
			this._root.appendChild(w);
			this._tabParent = w;
		}

		_createListeners() {
			this._tabSelectListener = (name, key) => {
				this._addTabUI(key);
			};

			this._clickListener = new Listener(
				this._addBtn, "click", () => {
					this._tabMenu.show();
			});

			this._updateTabMenu = () => {
				const tabs = this._tabManager.freeTabs;

				const names = tabs.map(i => i.type.tabName);
				const keys = tabs.map(i => i.key);

				this._tabMenu.update(names, keys);
			};
		}

		_addListeners() {
			this._tabMenu.onSelect.addListener(this._tabSelectListener);
			this._clickListener.attach();
			this._tabManager.onChange.addListener(this._updateTabMenu);
		}

		_removeListeners() {
			this._tabMenu.onSelect.removeListener(this._tabSelectListener);
			this._clickListener.remove();
			this._tabManager.onChange.removeListener(this._updateTabMenu);
		}

		_onAdd(elm) {
			this._updateTabMenu();
			this._addListeners();
		}

		_onRemove() {
			this._removeListeners();
		}

		addTab(key) {
			return this._addTabUI(key).id;
		}

		_addTabUI(key) {
			const ui = new TabUI();
			ui.addTo(this._tabUIParent);
			ui.tab = this._tabManager.use(key);
			ui.id = this._tabUICount;
			this._tabUICount += 1;
			this._tabUIs.push(ui);

			this._setActive(ui);

			ui.onClick.addListener(() => {
				this._setActive(ui);
			});
			ui.onRequestRemove.addListener(() => {
				this._removeTabUI(ui);
			});

			return ui;
		}

		_removeTabUI(val) {
			if (!(val instanceof TabUI)) {
				throw new Error("Invalid argument.");
			}

			const i = this._tabUIs.indexOf(val);
			if (i === -1) {
				throw new Error("Cannot find argument 'val'");
			}

			if (val === this._activeTabUI) {
				const l = this._tabUIs.length;
				if (l === 1) {
					this._setActive(null);
				} else {
					const n = i+1 === l ? i-1 : i+1,
						  next = this._tabUIs[n];
					this._setActive(next);
				}
			}

			val.remove();
			this._tabManager.free(val.tab.tabKey);
			val.dispose();

			this._tabUIs.splice(i, 1);
		}

		setActive(val) {
			if (val !== null &&
				!(val = this._tabUIs.find(t => t.id === val))) {
				throw new Error("Invalid argument.");
			}
			this._setActive(val);
		}

		_setActive(val) {
			if (this._activeTabUI) {
				this._activeTabUI.active = false;
				const tab = this._activeTabUI.tab;
				if (tab) {
					tab.remove();
				}
			}

			if (val) {
				val.active = true;
				const tab = val.tab;
				if (tab) {
					tab.addTo(this._tabParent);
				}
			}

			this._activeTabUI = val;
		}

		_onDispose() {
			this._setActive(null);
			this._tabUIs.forEach((ui) => {
				ui.remove();
				this._tabManager.free(ui.tab.tabKey);
				ui.dispose();
			});
			this._tabUIs = [];
		}
	};
})();

const TabUI = (function(){
	const CLASSES = {
		root: "tab",
		active: "active",
		text: "text",
		remove: "remove-btn"
	};

	return class extends Container {
		constructor() {
			super();

			this._tab = null;
			this._active = false;
			this.id = null;

			addEvent(this, "onClick");
			addEvent(this, "onRequestRemove");

			this._createDOM();
			this._createListeners();
		}

		get tab() {
			return this._tab;
		}

		set tab(val) {
			if (!(val instanceof Tab)) {
				throw new Error("Invalid argument.");
			}
			this._name.textContent = val.constructor.tabName || "";
			this._tab = val;
		}

		get active() {
			return this._active;
		}

		set active(val) {
			if (typeof val !== "boolean") {
				throw new Error("Invalid argument.");
			}
			this._root.classList.toggle(CLASSES.active, val);
			this._active = val;
		}

		_createDOM() {
			this._root.classList.add(CLASSES.root);

			const text = document.createElement("span");
			text.classList.add(CLASSES.text);
			this._root.appendChild(text);
			this._name = text;

			const remove = document.createElement("button");
			remove.type = "button";
			remove.innerHTML = "&times;";
			remove.classList.add(CLASSES.remove);
			this._root.appendChild(remove);
			this._removeBtn = remove;
		}

		_createListeners() {
			this._clickListener = new Listener(
				this._root, "click", () => {
					this._onClick.trigger();
			});

			this._removeListener = new Listener(
				this._removeBtn, "click", (evt) => {
					evt.stopPropagation();
					this._onRequestRemove.trigger();
			});
		}

		_addListeners() {
			this._clickListener.attach();
			this._removeListener.attach();
		}

		_removeListeners() {
			this._clickListener.remove();
			this._removeListener.remove();
		}

		_onAdd(elm) {
			this._addListeners();
		}

		_onRemove() {
			this._removeListeners();
			this._onClick.clear();
			this._onRequestRemove.clear();
		}

		_onDispose() {
			this._tab = null;
		}
	};
})();
