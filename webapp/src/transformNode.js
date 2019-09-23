
import { isType } from "./type";
import { removeDuplicates } from "./utility";
import { Vector2 } from "./geometry";
import { LayerGroup } from "./basicTypes";
import { Node, NodeInput, NodeOutput,
		 NodeSettingsContainer, NodeSettings } from "./node";
import { StringInput, NumericalInput,
		 Dropdown, DynamicList, Toggle } from "./input";
import MoveTool from "./moveTool";

export default (function(){
	const OPTIONS = {
		icon: "#icon-transform-node"
	};

	const SETTINGS = {
		transforms: { array: true },
		lockedTransform: { value: null, nostack: true, noupdate: true }
	};

	const DEFAULT_TRANSFORM = {
		tx: 0,
		ty: 0,
		sx: 1,
		sy: 1,
		angle: 0
	};

	const ADD = (a, b) => a + b,
		  MULTIPLY = (a, b) => a * b;

	const TRANSFORM_FUNCTIONS = {
		tx: ADD,
		ty: ADD,
		sx: MULTIPLY,
		sy: MULTIPLY,
		angle: ADD
	};

	const RECALC_SETTINGS = ["transforms", "range", "mode"],
		  READJUST_SETTINGS = ["tx", "ty", "sx", "sy", "angle"];

	const RANGE_REGEX = /^(\d+)-(\d+)$/;

	const matchExists = (a, b) => 
		Boolean(a.find(c => b.includes(c)));

	return class extends Node {
		constructor() {
			const input = new NodeInput(LayerGroup),
				  output = new NodeOutput(LayerGroup),
				  ui = new TransformNodeSettingsContainer(),
				  settings = new NodeSettings(SETTINGS);

			super([input], [output], ui, settings, OPTIONS);
		}

		get toolType() {
			return MoveTool;
		}

		_cook(inputs) {
			const group = inputs[0];
			if (!group) return [null];

			const init = !this._initialTransforms || this._dirtyInput;

			if (init) {
				this._group = group.copy();
				this._initialTransforms =
					group.layers.map(l => this._getInitialTransform(l));
			}

			if (init ||
				matchExists(this._dirtySettingNames, RECALC_SETTINGS)) {
				this._sortedTransforms =
					this._getSortedTransforms(
						this.settings.get("transforms"),
						this._initialTransforms);

				this._finalTransforms =
					this._sortedTransforms.map(
						arr => this._computeTransforms(arr));

			} else if (matchExists(this._dirtySettingNames, READJUST_SETTINGS)) {
				this._finalTransforms = this._sortedTransforms.map((arr, i) => {
					const final = this._finalTransforms[i];

					const found = this._dirtySettingInfos.find((p) =>
						Boolean(arr.find(t => t.settings === p.settings)));
					if (found) {
						found.names.forEach((name) => {
							this._adjustComputed(final, arr, name);
						});
					}

					return final;
				});
			}

			this._group.layers.forEach((l, i) => {
				const t = this._finalTransforms[i];
				this._applyTransform(l, t);
			});

			return [this._group];
		}

		_getInitialTransform(layer) {
			const transform = {};

			const t = layer.box.staticLocalPosition;
			transform.tx = t.x;
			transform.ty = t.y;

			const s = layer.box.localScale;
			transform.sx = s.x;
			transform.sy = s.y;

			transform.angle = layer.box.angle;

			return transform;
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
			let init;
			let skip = false;
			const first = transforms[0];
			if (isType(first, Object)) {
				init = Object.assign({}, first);
				skip = true;
			} else {
				init = Object.assign({}, DEFAULT_TRANSFORM);
			}

			return transforms.reduce((acc, t, i) => {
				if (!(skip && !i)) {
					acc.tx += t.settings.get("tx");
					acc.ty += t.settings.get("ty");
					acc.sx *= t.settings.get("sx");
					acc.sy *= t.settings.get("sy");
					acc.angle += t.settings.get("angle");
				}

				return acc;
			}, init);
		}

		_adjustComputed(computed, transforms, settingsName) {
			let start;
			let skip = false;
			const first = transforms[0];

			if (isType(first, Object)) {
				start = first[settingsName];
				skip = true;
			} else {
				start = DEFAULT_TRANSFORM[settingsName];
			}

			const func = TRANSFORM_FUNCTIONS[settingsName];
			computed[settingsName] = transforms.reduce((acc, t, i) => {
				return skip && !i ? acc : func(acc, t.settings.get(settingsName));
			}, start);
		}

		_applyTransform(layer, transform) {
			layer.box.angle = transform.angle;
			layer.box.localScale = new Vector2(transform.sx, transform.sy);
			layer.box.staticLocalPosition = new Vector2(transform.tx, transform.ty);
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
				const s = new TransformSettingsContainer();
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

		_createDOM() {
			this._box.element.classList.add(CLASSES.root);

			const list = new DynamicList();
			list.root.classList.add(CLASSES.transforms);
			this._box.element.appendChild(list.root);

			list.onAdd = () => {
				const tsc = this._settings.new("transforms");
				this._settings.tryPush("transforms", tsc, true);
			};

			list.onRemove = (element, tsc) => {
				this._settings.tryPush("transforms", tsc, false);
			};

			this._settings.addListener("transforms", (tsc, adding) => {
				if (adding) {
					list.add({
						element: tsc.box.element,
						data: tsc });
				} else {
					list.remove(tsc.box.element);
				}
			});
		}
	};
})();

const TransformSettingsContainer = (function(){
	const OPTIONS = {
		lock: { value: false, nostack: true, noupdate: true },
		fixAspectRatio: { value: false },
		mode: { value: "add" },
		range: { value: "0" },
		tx: { value: 0 },
		ty: { value: 0 },
		sx: { value: 1 },
		sy: { value: 1 },
		angle: { value: 0 }
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

	return class extends NodeSettingsContainer {
		constructor() {
			super();
			this._settings = new NodeSettings(OPTIONS);

			this._createDOM();
			this._addListeners();
		}

		_createDOM() {
			this._box.element.className = CLASSES.root;

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
			this._box.element.appendChild(root);
		}

		_createLockToggle() {
			const iv = this._settings.get("lock");
			this._lockToggle = new Toggle(iv, { text: "Lock" });

			const root = this._lockToggle.root;
			root.classList.add(CLASSES.lock);
			this._box.element.appendChild(root);
		}

		_createMode() {
			this._mode =
				new Dropdown(["add", "set"],
					{ text: "Mode" });
			this._mode.value = this._settings.get("mode");

			const root = this._mode.root;
			root.classList.add(CLASSES.mode);
			this._box.element.appendChild(root);
		}

		_createRange() {
			this._range =
				new StringInput(
					{ text: "Range",
					  value: this._settings.get("range") });
			this._range.root.classList.add(CLASSES.range);
			this._box.element.appendChild(this._range.root);
		}

		_createAngle(bounds) {
			this._angle =
				new NumericalInput(
					{ text: "Angle",
					  value: this._settings.get("angle"),
					  bounds: bounds });
			this._angle.root.classList.add(CLASSES.angle);
			this._box.element.appendChild(this._angle.root);
		}

		_createTranslate(bounds) {
			const t = document.createElement("div");
			t.classList.add(CLASSES.vector);
			this._box.element.appendChild(t);

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
			this._box.element.appendChild(s);

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

			this._fixToggle.onChange.addListener((val) => {
				this._settings.tryPut("fixAspectRatio", val);
			});
			this._settings.addListener("fixAspectRatio", (val) => {
				console.log("val:", val);
				this._fixToggle.value = val;
			});

			this._mode.onSelect.addListener((val) => {
				this._settings.tryPut("mode", val);
			});
			this._settings.addListener("mode", (val) => {
				this._mode.value = val;
			});

			["range", "tx", "ty", "sx", "sy", "angle"].forEach((name) => {
				const input = this["_" + name];

				input.onChange.addListener((val) => {
					this._settings.tryPut(name, val);
				});
				this._settings.addListener(name, (val) => {
					input.value = val;
				});
			});
		}
	};
})();
