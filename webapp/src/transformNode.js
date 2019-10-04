
import { isType } from "./type";
import { removeDuplicates } from "./utility";
import { Vector2 } from "./geometry";
import { LayerGroup } from "./layer";
import { Node, NodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "./node";
import { StringInput, NumericalInput,
		 Dropdown, UnorderedList, Toggle } from "./input";

export default (function(){
	const OPTIONS = {
		icon: "#icon-transform-node"
	};

	const SETTINGS = {
		transforms: { array: true },
		lockedTransform: { value: null }
	};

	const DEFAULT_TRANSFORM = {
		tx: 0,
		ty: 0,
		pretx: 0,
		prety: 0,
		sx: 1,
		sy: 1,
		angle: 0
	};

	const matchExists = (a, b) => 
		Boolean(a.find(c => b.includes(c)));

	const RANGE_REGEX = /^(\d+)-(\d+)$/;

	return class extends Node {
		constructor() {
			const input = new NodeInput(LayerGroup),
				  output = new NodeOutput(LayerGroup),
				  ui = new TransformNodeSettingsContainer(),
				  settings = new NodeSettings(SETTINGS);

			super([input], [output], ui, settings, OPTIONS);
		}

		get toolType() {
			return "MoveTool";
		}

		_cook(inputs) {
			const group = inputs[0];
			if (!group) {
				return [null];
			}

			const init = Boolean(
				!this._initialTransforms ||
					this._dirtyInputs.length);

			if (init) {
				this._group = group.copy();
				this._initialTransforms =
					group.layers.map(l => this._getInitialTransform(l));
			}

			const sort = init ||
				matchExists(
					this._dirtySettings,
					["transforms", "range", "mode"]);
			const calc =
				matchExists(
					this._dirtySettings,
					["tx", "ty", "sx", "sy", "angle"]);

			if (sort) {
				this._sortedTransforms =
					this._getSortedTransforms(
						this.settings.get("transforms"),
						this._initialTransforms);
			}
			if (sort || calc) {
				this._finalTransforms =
					this._sortedTransforms.map(
						arr => this._computeTransforms(arr));
			}

			this._group.layers.forEach((l, i) => {
				const t = this._finalTransforms[i];
				this._applyTransform(l, t);
			});

			return [this._group];
		}

		_getInitialTransform(layer) {
			const t = layer.box.localPosition,
				  s = layer.box.localScale,
				  a = layer.box.degrees;

			return {
				pretx: 0,
				prety: 0,
				tx: t.x,
				ty: t.y,
				sx: s.x,
				sy: s.y,
				angle: a
			};
		}

		_getSortedTransforms(transforms, initial) {
			const sorted = initial.map(t => [t]);

			const push = (t, i) => {
				const arr = sorted[i];

				if (t.settings.get("mode") === "set") {
					arr[0] = t;
				} else {
					arr.push(t);
				}
			};

			const length = initial.length;
			transforms.forEach((t) => {
				const range = this._parseRange(t.settings.get("range"));

				range.forEach((i) => {
					if (i < length) {
						push(t, i);
					}
				});
			});

			return sorted;
		}

		_parseRange(string) {
			const ranges = string.split(",").map(s => s.trim()).filter(Boolean);

			let nums = ranges.reduce((acc, cur) => {
				const num = Number(cur);

				if (Number.isInteger(num)) {
					acc.push(num);
				} else if (isNaN(num)) {			
					const matches = cur.match(RANGE_REGEX);
					if (matches !== null && matches.length === 3) {
						const start = Number(matches[1]),
							  end = Number(matches[2]);
						if (Number.isInteger(start) &&
							Number.isInteger(end)) {
							for (let i = start; i <= end; i+=1) {
								acc.push(i);
							}
						}
					}
				}

				return acc;
			}, []);

			nums = removeDuplicates(nums);

			return nums;
		}

		_computeTransforms(transforms) {
			let final;
			let skip = false;
			const first = transforms[0];
			if (isType(first, Object)) {
				final = Object.assign({}, first);
				skip = true;
			} else {
				final = Object.assign({}, DEFAULT_TRANSFORM);
			}

			transforms.forEach((t, i) => {
				if (skip && i === 0) return;

				final.tx += t.settings.get("tx");
				final.ty += t.settings.get("ty");
				final.pretx += t.settings.get("pretx");
				final.prety += t.settings.get("prety");
				final.sx *= t.settings.get("sx");
				final.sy *= t.settings.get("sy");
				final.angle += t.settings.get("angle");
			});

			return final;
		}

		_applyTransform(layer, transform) {
			layer.box.degrees = transform.angle;
			layer.box.localScale = new Vector2(transform.sx, transform.sy);
			const x = transform.tx + transform.pretx,
				  y = transform.ty + transform.prety;
			layer.box.localPosition = new Vector2(x, y);
		}
	};
})();

const TransformNodeSettingsContainer = (function(){
	const CLASSES = {
		root: "transform-node-settings",
		transforms: "transforms"
	};

	return class extends NodeSettingsContainer {
		constructor() {
			super();

			this._transformBuilder = () => {
				const s = new Transform();
				s.settings.linkTo(this._settings);
				return s;
			};
		}

		get settings() {
			return super.settings;
		}

		set settings(val) {
			super.settings = val;
			this._settings.setBuilder(
				"transforms", this._transformBuilder);
		}

		_initDOM() {
			this._createDOM();
			this._addListeners();
		}

		_createDOM() {
			this._box.element.classList.add(CLASSES.root);

			const list = new UnorderedList({ userAdd: true });
			list.root.classList.add(CLASSES.transforms);
			this._box.element.appendChild(list.root);
			this._transformList = list;
		}

		_addListeners() {
			this._transformList.onRequestAdd(() => {
				const t = this._settings.new("transforms");
				this._settings.tryPush("transforms", t, true);
			});

			this._transformList.onRequestRemove((element, t) => {
				this._settings.tryPush("transforms", t, false);
			});

			this._settings.addListener("transforms", (t, adding) => {
				if (adding) {
					this._transformList.add(t.root, t);
				} else {
					this._transformList.remove(t.root);
				}
			});
		}
	};
})();

const Transform = (function(){
	const OPTIONS = {
		lock: { value: false, nostack: true, noupdate: true },
		fixAspectRatio: { value: false },
		mode: { value: "add" },
		range: { value: "0" },
		tx: { value: 0 },
		ty: { value: 0 },
		sx: { value: 1 },
		sy: { value: 1 },
		angle: { value: 0 },
		pretx: { value: 0, nostack: true, noupdate: true },
		prety: { value: 0, nostack: true, noupdate: true }
	};

	const CLASSES = {
		root: "transform-settings",
		vector: "vector",
		x: "x",
		y: "y",
		title: "title",
		lock: "lock",
		mode: "mode",
		range: "range",
		angle: "angle"
	};

	const SCALE_DRAG_SPEED = 0.01;

	return class {
		constructor() {
			this._settings = new NodeSettings(OPTIONS);

			this._createDOM();
			this._addListeners();
		}

		get settings() {
			return this._settings;
		}

		_createDOM() {
			this.root = document.createElement("div");
			this.root.classList.add(CLASSES.root);

			this._createFixToggle();
			this._createLockToggle();

			this._createMode();
			this._createRange();

			const bounds = document;
			this._createTranslate(bounds);
			this._createScale(bounds);
			this._createAngle(bounds);
		}

		_createFixToggle() {
			const iv = this._settings.get("fixAspectRatio");
			this._fixToggle = new Toggle(iv, { text: "Fix Aspect" });

			const root = this._fixToggle.root;
			root.classList.add(CLASSES.lock);
			this.root.appendChild(root);
		}

		_createLockToggle() {
			const iv = this._settings.get("lock");
			this._lockToggle = new Toggle(iv, { text: "Lock" });

			const root = this._lockToggle.root;
			root.classList.add(CLASSES.lock);
			this.root.appendChild(root);
		}

		_createMode() {
			this._mode =
				new Dropdown(["add", "set"],
					{ text: "Mode" });
			this._mode.value = this._settings.get("mode");

			const root = this._mode.root;
			root.classList.add(CLASSES.mode);
			this.root.appendChild(root);
		}

		_createRange() {
			this._range =
				new StringInput(
					{ text: "Range",
					  value: this._settings.get("range") });
			this._range.root.classList.add(CLASSES.range);
			this.root.appendChild(this._range.root);
		}

		_createAngle(bounds) {
			this._angle =
				new NumericalInput(
					{ text: "Angle",
					  value: this._settings.get("angle"),
					  bounds: bounds });
			this._angle.root.classList.add(CLASSES.angle);
			this.root.appendChild(this._angle.root);
		}

		_createTranslate(bounds) {
			const t = document.createElement("div");
			t.classList.add(CLASSES.vector);
			this.root.appendChild(t);

			const text = document.createElement("span");
			text.textContent = "Translate";
			text.classList.add(CLASSES.title);
			t.appendChild(text);

			this._tx =
				new NumericalInput(
					{ text: "X",
					  value: this._settings.get("tx"),
					  bounds: bounds });
			this._tx.root.classList.add(CLASSES.x);
			t.appendChild(this._tx.root);

			this._ty =
				new NumericalInput(
					{ text: "Y",
					  value: this._settings.get("ty"),
					  bounds: bounds });
			this._ty.root.classList.add(CLASSES.y);
			t.appendChild(this._ty.root);
		}

		_createScale(bounds) {
			const s = document.createElement("div");
			s.classList.add(CLASSES.vector);
			this.root.appendChild(s);

			const text = document.createElement("span");
			text.textContent = "Scale";
			text.classList.add(CLASSES.title);
			s.appendChild(text);

			this._sx =
				new NumericalInput(
					{ text: "X",
					  value: this._settings.get("sx"),
					  bounds: bounds,
					  speed: SCALE_DRAG_SPEED });
			this._sx.root.classList.add(CLASSES.x);
			s.appendChild(this._sx.root);

			this._sy =
				new NumericalInput(
					{ text: "Y",
					  value: this._settings.get("sy"),
					  bounds: bounds,
					  speed: SCALE_DRAG_SPEED });
			this._sy.root.classList.add(CLASSES.y);
			s.appendChild(this._sy.root);
		}

		_addListeners() {
			this._lockToggle.onChange.addListener((val) => {
				this._settings.tryPut("lock", val);
			});
			this._settings.addListener("lock", (val) => {
				this._lockToggle.value = val;

				let lt;
				const old = this._settings.parent.get("lockedTransform");
				const same = old === this;
				if (val) {				
					if (old && !same) {
						old.settings.put("lock", false); 
					}
					lt = this;
				} else {
					lt = null;
				}
				this._settings.parent.put("lockedTransform", lt);
			});

			this._mode.onSelect.addListener((val) => {
				this._settings.tryPut("mode", val);
			});
			this._settings.addListener("mode", (val) => {
				this._mode.value = val;
			});

			this._fixToggle.onChange.addListener((val) => {
				this._settings.tryPut("fixAspectRatio", val);
			});
			this._settings.addListener("fixAspectRatio", (val) => {
				this._fixToggle.value = val;
			});

			["range", "tx", "ty", "angle"].forEach((name) => {
				const input = this["_" + name];

				input.onChange.addListener((val) => {
					this._settings.tryPut(name, val);
				});
				this._settings.addListener(name, (val) => {
					input.value = val;
				});
			});

			[["sx", "sy"], ["sy", "sx"]].forEach((names) => {
				const n1 = names[0],
					  n2 = names[1],
					  a = this["_" + n1],
					  b = this["_" + n2];

				a.onChange.addListener((val) => {
					this._settings.tryPut(n1, val);
				});
				this._settings.addListener(n1, (val, skip) => {
					if (skip === true) return;

					a.value = val;
					if (this._settings.get("fixAspectRatio") === true) {
						b.value = val;
						this._settings.put(n2, val, [true]);
					}
				});
			});
		}
	};
})();
