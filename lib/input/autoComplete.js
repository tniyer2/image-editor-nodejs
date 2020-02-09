
import { show, hide } from "../util/util";
import { addEvent } from "../event/util";
import Options from "../util/options";

const g_evaluate = (b, s) => shortestMatch(b, s, true);

const cl_root = "auto-complete";
const cl_hide = "noshow";
const cl_activeLi = "active";
const DEFAULTS = { values: [],
				   caseSensitive: false };

function onKeyDown(elm, key, callback) {
	elm.addEventListener("keydown", (evt) => {
		if (evt.key === key)
		{
			callback(evt);
		}
	});
}

export default class {
	constructor(input, options) {
		this._input = input;
		this.options = new Options();
		this.options.set(DEFAULTS, options);

		const values = this.options.get("values");
		if (values.constructor !== Array) {
			throw new Error("option 'values' is not valid: " + values);
		}

		addEvent(this, "onConfirm");

		this._createDOM();
		this._attachEvents();
		this._close();
	}

	_createDOM() {
		this._list = document.createElement("ul");
		this._list.classList.add(cl_root);
	}

	_attachEvents() {
		this._input.addEventListener("input", (evt) => {
			this._update(this._input.value);
		});
		this._input.addEventListener("blur", (evt) => {
			this._close();
		});

		onKeyDown(this._input, "ArrowUp", (evt) => {
			evt.preventDefault();
			this._scroll(false);
		});
		onKeyDown(this._input, "ArrowDown", (evt) => {
			evt.preventDefault();
			this._scroll(true);
		});

		const form = this.options.get("form");
		const val = () => this.visible && this.selected ?
						  this.selected.innerText : null;
		if (form) {
			form.addEventListener("submit", (evt) => {
				evt.preventDefault();
				this._confirm(val());
			});
		} else {
			onKeyDown(this._input, "Enter", (evt) => {
				this._confirm(val());
			});
		}
	}

	get list() {
		return this._list;
	}

	get prevSelected() {
		return this._prevSelected;
	}

	get selected() {
		return this._selected;
	}

	set selected(elm) {
		if (this._selected) {
			this._selected.classList.remove(cl_activeLi);
			this._prevSelected = this._selected.innerText;
		} else {
			this._prevSelected = null;
		}

		if (elm) {
			elm.classList.add(cl_activeLi);
			elm.scrollIntoView({block: "nearest"});
		}
		this._selected = elm;
	}

	get visible() {
		return !this._list.classList.contains(cl_hide);
	}

	_update(text) {
		const ftext = this._formatInput(text);

		if (!ftext) {
			this._close();
		} else {
			const values = this._getSimilarValues(ftext, g_evaluate);
			if (values.length > 0) {
				this._setList(values);
			} else {
				this._close();
			}
		}
	}

	_scroll(inward) {
		if (this.selected) {
			if (inward && this.selected.nextSibling) {
				this.selected = this.selected.nextSibling;
			} else if (!inward && this.selected.previousSibling) {
				this.selected = this.selected.previousSibling;
			}
			else {/*ignore*/}
		} else if (inward) {
			this.selected = this._list.firstChild;	
		} else {/*ignore*/}
	}

	_confirm(val) {
		if (val) {
			this._input.value = val;
		} else {
			val = this._input.value;
		}

		this._onConfirm.trigger(val, this._input);
		this._close();
	}

	_formatInput(text) {
		if (!text) {
			return text;
		}

		if (!this.options.get("caseSensitive")) {
			text = text.toLowerCase();
		}

		return text;
	}

	_getSimilarValues(text, comp) {
		const cache = {};
		const values = this.options.get("values");
		values.forEach((val) => {
			cache[val] = comp(val, text);
		});

		return values.slice()
			   .filter(s => cache[s] !== null)
			   .sort((s1, s2) => cache[s2] - cache[s1]);
	}

	_setList(values) {
		this._clearList();

		values.forEach((val) => {
			const li = this._createLi(val);
			this._list.appendChild(li);

			if (!this.selected) {
				if (li.innerText === this.prevSelected) {
					this.selected = li;
				}
			}
		});

		show(this._list);
	}

	_createLi(text) {
		const li = document.createElement("li");

		li.addEventListener("mousemove", () => {
			if (this.selected !== li) {
				this.selected = li;
			}
		});
		li.addEventListener("click", (evt) => {
			evt.preventDefault();
			this._confirm(text);
		});
		li.addEventListener("mousedown", (evt) => {
			evt.preventDefault();
		});

		const textNode = document.createTextNode(text);
		li.appendChild(textNode);

		return li;
	}

	_clearList() {
		this.selected = null;

		let c;
		while ((c = this._list.firstChild)) {
			this._list.removeChild(c);
		}
	}

	_close() {
		hide(this._list);
		this._clearList();
	}
}

// eslint-disable-next-line no-unused-vars
function timesFound(bigString, smallString) {
	let count = 0,
		found = 0;
	while (true) {
		found = bigString.indexOf(smallString, found);
		if (found === -1) {
			break;
		}
		else {
			count += 1;
			found +=1;
		}
	}

	if (count === 0) return null;
	else return count;
}

// eslint-disable-next-line no-unused-vars
function shortestMatch(bigString, smallString, includeSameString) {
	let found = bigString.indexOf(smallString);

	if (found !== 0) {
		return null;
	} else {
		const val = smallString.length - bigString.length;
		return !includeSameString && val === 0 ? null : val;
	}
}
