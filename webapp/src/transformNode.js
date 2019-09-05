
import { isType, isArray } from "./type";
import { Vector2 } from "./geometry";
import { LayerGroup } from "./basicTypes";
import
	{ Node, NodeInput, NodeOutput,
		NodeSettingsContainer, NodeSettings }
			from "./node";
import { TextInput, Dropdown, DynamicList } from "./input";

export default (function(){
	const OPTIONS = {
		icon: "#icon-transform-node"
	};

	const SETTINGS = {
		transforms: { array: true }
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

	return class extends Node {
		constructor() {
			const input = new NodeInput(LayerGroup),
				  output = new NodeOutput(LayerGroup),
				  ui = new TransformNodeSettingsContainer(),
				  settings = new NodeSettings(SETTINGS);

			super([input], [output], ui, settings, OPTIONS);
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

			if (init || RECALC_SETTINGS.includes(this._dirtySettingsName)) {
				this._sortedTransforms =
					this._getSortedTransforms(
						this.settings.get("transforms"),
						this._initialTransforms);

				this._finalTransforms =
					this._sortedTransforms.map(
						arr => this._computeTransforms(arr));

			} else if (READJUST_SETTINGS.includes(this._dirtySettingsName)) {
				this._finalTransforms = this._sortedTransforms.map((arr, i) => {
					const final = this._finalTransforms[i];

					if (arr.find(t =>
							isType(t, TransformSettingsContainer) &&
								t.options === this._dirtySettingsObject)) {
						this._adjustComputed(final, arr, this._dirtySettingsName);
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

			const t = layer.box.localPosition;
			transform.tx = t.x;
			transform.ty = t.y;

			const s = layer.box.localScale;
			transform.sx = s.x;
			transform.sy = s.y;

			transform.angle = layer.box.localAngle;

			return transform;
		}

		_getSortedTransforms(transforms, initial) {
			const sorted = initial.map(t => [t]);

			const push = (t, i) => {
				const arr = sorted[i];

				if (t.options.get("mode") === "set") {
					arr[0] = t;
				} else {
					arr.push(t);
				}
			};

			transforms.forEach((t) => {
				const range = this._parseRange(t.options.get("range"));

				if (isArray(range)) {
					range.forEach((i) => {
						push(t, i);
					});
				} else {
					push(t, range);
				}
			});

			return sorted;
		}

		_parseRange(rangeString) {
			return Number(rangeString);
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
					acc.tx += t.options.get("tx");
					acc.ty += t.options.get("ty");
					acc.sx *= t.options.get("sx");
					acc.sy *= t.options.get("sy");
					acc.angle += t.options.get("angle");
				}

				return acc;
			}, init);
		}

		// @TODO: add TRANSFORM_FUNCTIONS instead of manually checking.
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
				return skip && !i ? acc : func(acc, t.options.get(settingsName));
			}, start);
		}

		_applyTransform(layer, transform) {
			layer.box.localPosition = new Vector2(transform.tx, transform.ty);
			layer.box.localScale = new Vector2(transform.sx, transform.sy);
			layer.box.localAngle = transform.angle;
		}
	};
})();

const TransformNodeSettingsContainer = (function(){
	const CLASSES =
	{ transforms: "transforms" };

	return class extends NodeSettingsContainer {
		_createDOM() {
			const list = new DynamicList();
			list.root.classList.add(CLASSES.transforms);
			this._box.element.appendChild(list.root);

			list.onAdd = () => {
				const s = this._createTransformSettings();
				this.options.tryPush("transforms", s, true);
			};

			list.onRemove = (element, tsc) => {
				this.options.tryPush("transforms", tsc, false);
			};

			this.options.addListener("transforms", (tsc, adding) => {
				if (adding) {
					list.add({
						element: tsc.box.element,
						data: tsc });
				} else {
					list.remove(tsc.box.element);
				}
			});
		}

		_createTransformSettings() {
			const s = new TransformSettingsContainer();

			s.options.linkTo(this.options);

			return s;
		}
	};
})();

const TransformSettingsContainer = (function(){
	const OPTIONS = {
		mode: { value: "add" },
		range: { value: "0" },
		tx: { value: 0 },
		ty: { value: 0 },
		sx: { value: 1 },
		sy: { value: 1 },
		angle: { value: 0 }
	};

	const CLASSES = {
		translate: "translate",
		scale: "scale"
	};

	return class extends NodeSettingsContainer {
		constructor() {
			super();
			this.options = new NodeSettings(OPTIONS);

			this._createDOM();
			this._addListeners();
		}

		_createDOM() {
			const d = this._box.element;

			this._mode =
				new Dropdown(["add", "set"],
					{ text: "Mode",
					  selectedIndex: 0 });
			d.appendChild(this._mode.root);

			this._range =
				new TextInput(
					{ text: "Range",
					  value: this.options.get("range") });
			d.appendChild(this._range.root);

			const t = document.createElement("div");
			t.classList.add(CLASSES.translate);
			d.appendChild(t);

			this._tx =
				new TextInput(
					{ text: "Translate",
					  numerical: true,
					  value: this.options.get("tx") });
			t.appendChild(this._tx.root);
			this._ty =
				new TextInput(
					{ numerical: true,
					  value: this.options.get("ty") });
			t.appendChild(this._ty.root);

			const s = document.createElement("div");
			s.classList.add(CLASSES.scale);
			d.appendChild(s);

			this._sx =
				new TextInput(
					{ text: "Scale",
					  numerical: true,
					  value: this.options.get("sx") });
			s.appendChild(this._sx.root);
			this._sy =
				new TextInput(
					{ numerical: true,
					  value: this.options.get("sy") });
			s.appendChild(this._sy.root);

			this._angle =
				new TextInput(
					{ numerical: true,
					  value: this.options.get("angle") });
			d.appendChild(this._angle.root);
		}

		_addListeners() {
			this._mode.onSelect.addListener((val) => {
				this.options.tryPut("mode", val);
			});
			this.options.addListener("mode", (val, fromTryInput) => {
				if (!fromTryInput) {
					this._mode.value = val;
				}
			});

			["range", "tx", "ty", "sx", "sy", "angle"].forEach((name) => {
				const input = this["_" + name];

				input.onChange.addListener((val) => {
					this.options.tryPut(name, val);
				});
				this.options.addListener(name, (val, fromTryInput) => {
					if (!fromTryInput) {
						input.value = val;
					}
				});
			});
		}
	};
})();
