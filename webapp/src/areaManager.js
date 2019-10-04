
import { isSubclass } from "./type";
import { addEvent } from "./event";
import { ConstantDictionary } from "./dictionary";
import { Box } from "./geometry";
import { AreaWrapper, Area, Tab } from "./area";

export default class {
	constructor(root) {
		if (!(root instanceof Box)) {
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
