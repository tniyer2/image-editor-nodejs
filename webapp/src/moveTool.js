
import { bindFunctions, make, show, hide, preventBubble } from "./utility";
import { addOptions } from "./options";
import { Box } from "./geometry";
import { MouseAction } from "./action";
import { Toggle } from "./input";
import { SelectWidget } from "./widget";
import { DragWidget, ResizeWidget, RotateWidget } from "./boxWidgets";
import ToolUI from "./toolUI";

export { MoveTool, MoveToolUI };

const MoveTool = (function(){
	const cl_moveBox = "move-box",
		  cl_background = "move-box__background",
		  cl_resizeHandle = "move-box__resize-handle",
		  RESIZE_DIRECTIONS = ["tl", "tr", "br", "bl"],
		  cl_rotateHandle = "move-box__rotate-handle",
		  cl_rotateConnector = "move-box__rotate-connector";
	const DEFAULTS = { "fixAspectRatio": true };

	return class {
		constructor(editor) {
			this._editor = editor;
			addOptions(this, DEFAULTS);

			bindFunctions(this, ["_updateMoveBox", "_updateDOM", "_update"]);

			this._createBoxes();
			this._createWidgets();
		}

		_createBoxes() {
			const parent = this._editor.layerManager.innerViewport;

			const d = make("div");
			d.classList.add(cl_moveBox);
			this._moveBox = new Box(d, parent);

			const background = make("div");
			background.classList.add(cl_background);
			d.appendChild(background);

			const connector = make("div");
			connector.classList.add(cl_rotateConnector);
			d.appendChild(connector);

			const rot = make("div");
			preventBubble(rot, "mousedown");
			rot.classList.add(cl_rotateHandle);
			d.appendChild(rot);
			this._rotateBox = new Box(rot, parent);

			this._resizeBoxes = RESIZE_DIRECTIONS.map((dir) => {
				const handle = make("div");
				preventBubble(handle, "mousedown");
				handle.classList.add(cl_resizeHandle, dir);
				d.appendChild(handle);

				return new Box(handle, parent);
			});
		}

		_createWidgets() {
			const bounds = this._editor.layerManager.viewport.element;
			this._moveBoxAction = new MouseAction(this._moveBox.element, bounds);

			this._selectWidget = new SelectWidget(this._editor.layerManager);
			this._selectWidget.handle(this._moveBoxAction);

			const boxGroups = [{ stack: this._editor.stack,
								 boxes: () => this._editor.layerManager.selected }, {
								 boxes: [this._moveBox] }];

			this._dragWidget = new DragWidget(boxGroups);
			this._dragWidget.handle(this._moveBoxAction);

			this._rotateWidget = new RotateWidget(boxGroups, 
									 { center: () => this._moveBox.center });
			const rotAction = new MouseAction(this._rotateBox.element, bounds);
			this._rotateWidget.handle(rotAction);

			this._resizeWidgets = this._resizeBoxes.map((box, i) => {
				const options  = { angle: () => this._moveBox.angle };
				const options2 = { direction: i * 2,
								   fixAspectRatio: this._options.get("fixAspectRatio") };
				const widget = new ResizeWidget(boxGroups, options, options2);
				this._options.addListener("fixAspectRatio", (v) => {
					widget.resizeOptions.put("fixAspectRatio", v);
				});
				const action = new MouseAction(box.element, bounds); 
				widget.handle(action);
				return widget;
			});
		}

		_updateMoveBox() {
			const selected = this._editor.layerManager.selected;
			if (selected.length) {
				let fitRect;
				if (selected.length > 1) {
					this._moveBox.angle = 0;
					fitRect = Box.getBoundingBox(selected);
				} else {
					const l = selected[0];
					this._moveBox.angle = l.angle;
					fitRect = l;
				}
				["top", "left", "width", "height"].forEach((p) => {
					this._moveBox[p] = fitRect[p];
				});
			}
		}

		_updateDOM() {
			const d = this._moveBox.element,
				  selected = this._editor.layerManager.selected;
			if (selected.length) {
				show(d);
			} else {
				hide(d);
			}
		}

		_update() {
			this._updateDOM();
			this._updateMoveBox();
		}

		enable() {
			const layers = this._editor.layerManager.layerMouseAction;
			this._selectWidget.handle(layers);
			this._dragWidget.handle(layers);

			this._editor.layerManager.onSelectedChange.addListener(this._update);
			this._editor.stack.onChange.addListener(this._updateMoveBox);

			this._editor.layerManager.viewport.element.firstElementChild.appendChild(this._moveBox.element);

			this._update();
		}

		disable() {
			const layers = this._editor.layerManager.layerMouseAction;
			this._selectWidget.stopHandling(layers);
			this._dragWidget.stopHandling(layers);

			this._editor.layerManager.onSelectedChange.removeListener(this._update);
			this._editor.stack.onChange.removeListener(this._updateMoveBox);

			this._moveBox.element.remove();
		}
	};
})();

const MoveToolUI = (function(){
	const cl_fixAspectRatio = "fix-aspect-ratio";
	const txt_fixAspectRatio = "Keep Aspect Ratio";

	return class extends ToolUI {
		constructor(settings, globals) {
			super();
			this._settings = settings;
			this._globals = globals;
		}

		_createUI() {
			const d = make("div");

			const initValue = this._settings.get("fixAspectRatio");
			const toggle = new Toggle(initValue, { text: txt_fixAspectRatio });
			toggle.onToggle.addListener((b) => {
				this._settings.put("fixAspectRatio", b);
			});

			const t = toggle.root;
			t.classList.add(cl_fixAspectRatio);
			d.appendChild(t);

			return d;
		}
	};
})();