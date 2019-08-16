
import { isFunction } from "./type";
import { addEvent } from "./event";
import Options from "./options";

export { Collection, BASE, SELECT };

const Collection = (function(){
	const SINGLE = 0, MULTIPLE = 1;

	function addEventAndListen(obj, n, l) {
		if (n) {
			addEvent(obj, n);
			const f = obj.options.get(l, false);
			if (isFunction(f)) {
				obj[n].addListener(f);
			}
		}
	}

	const Inner2 = function (info) {
		class Inner {
			constructor(options) {
				this.options = new Options();
				this.options.set(options);

				info.forEach((p) => {
					if (p.type === Collection.MULTIPLE) {
						this["_" + p.var] = [];
						addEventAndListen(this, p.onAdd, p.onAdd);
						addEventAndListen(this, p.onRemove, p.onRemove);
						addEventAndListen(this, p.onChange, p.onChange);
					} else if (p.type === Collection.SINGLE) {
						this["_" + p.var] = p.defaultVar;
						addEventAndListen(this, p.onSet, p.onSet);
					} else {
						throw new Error("Invalid type: " + p.type);
					}
				});
			}
		}

		info.forEach((p) => {
			const pub = p.var,
				  priv = "_" + pub;
			if (p.type === Collection.MULTIPLE) {
				Object.defineProperty(Inner.prototype, pub, {
					get: function() {
						return this[priv].slice();
					}
				});

				Inner.prototype[p.add] = function(item) {
					this[priv].push(item);
					if (p.onAdd) {
						this["_" + p.onAdd].trigger(item);
					}
					if (p.onChange) {
						this["_" + p.onChange].trigger(p.add);
					}
				};

				Inner.prototype[p.remove] = function(item) {
					const i = this[priv].findIndex(o => o === item);
					const found = i !== -1;
					if (found) {
						this[priv].splice(i, 1);

						if (p.onRemove) {
							this["_" + p.onRemove].trigger(item);
						}
						if (p.onChange) {
							this["_" + p.onChange].trigger(p.remove);
						}
					}
					return found;
				};

				if (p.clear) {
					Inner.prototype[p.clear] = function() {
						const old = this[priv];
						this[priv] = [];

						old.forEach((item) => {
							if (p.onRemove) {
								this["_" + p.onRemove].trigger(item);
							}
						});
						if (p.onChange) {
							this["_" + p.onChange].trigger(p.clear);
						}
					};
				}

				if (p.addOnly) {
					Inner.prototype[p.addOnly] = function(newItem) {
						let n = this[priv].filter(o => o === newItem);
						if (n.length > 1) {
							console.warn("item is referenced multiple times in array:", newItem);
							n = n.slice(0, 1);
						}
						const old = this[priv].filter(o => o !== newItem);

						if (n.length) {
							this[priv] = n;
						}

						old.forEach((item) => {
							if (p.onRemove) {
								this["_" + p.onRemove].trigger(item);
							}
						});

						if (!n.length) {
							this[priv] = [newItem];
							if (p.onAdd) {
								this["_" + p.onAdd].trigger(newItem);
							}
						}

						if (p.onChange) {
							this["_" + p.onChange].trigger(p.addOnly);
						}
					};
				}
			} else if (p.type === Collection.SINGLE) {
				Object.defineProperty(Inner.prototype, pub, {
					get: function() {
						return this[priv];
					},
					set: function(val) {
						const old = this[priv];
						this[priv] = val;
						if (p.onSet) {
							this["_" + p.onSet].trigger(old, val);
						}
					}
				});
			} else {
				throw new Error("Invalid type: " + p.type);
			}
		});

		return Inner;
	};

	Object.defineProperty(Inner2, "SINGLE", {get: () => SINGLE});
	Object.defineProperty(Inner2, "MULTIPLE", {get: () => MULTIPLE});

	return Inner2;
})();

const BASE = Object.freeze(
{ type: Collection.MULTIPLE, var: "items",
  add: "add", remove: "remove",
  onAdd: "onAdd", onRemove: "onRemove",
  onChange: "onChange" });

const SELECT = Object.freeze(
{ type: Collection.MULTIPLE, var: "selected",
  add: "select", remove: "deselect",
  clear: "deselectAll", addOnly: "selectOnly",
  onAdd: "onSelect", onRemove: "onDeselect",
  onChange: "onSelectedChange" });
