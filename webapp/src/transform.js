
import Enforcer from "./enforcer";
import { preventBubble, show, hide, forEach, addGetter, extend, isUdf } from "./utility";
import { Box, Vector2 } from "./geometry";
import { MouseAction } from "./event";
import { DragCommand, ResizeCommand, RotateCommand } from "./transformCommands";
import { BoxWidget, SelectWidget } from "./widget";
import { Tool } from "./tool";
import { ToolUI } from "./toolUI";
import { Toggle } from "./input";

export { MoveTool, MoveToolUI, DragWidget };

class DragWidget extends BoxWidget {
	constructor(options, dragOptions) {
		super(options);

		this._stack = this._options.stack;
		this._dragOptions = dragOptions;
	}

	_onClick(mdEvt, muEvt){}

	_onStart(evt) {
		const args = [ this._getMousePosition(evt), 
					   this._dragOptions ];

		if (this._stack) {
			this._command = new DragCommand(this._boxes, ...args);
			this._stack.add(this._command);
		}
		this._offStackCommand = new DragCommand(this._offStackBoxes, ...args);
	}

	_onMove(evt) {
		const args = [ this._getMousePosition(evt), 
					   evt.shiftKey, 
					   evt.ctrlKey ];

		if (this._command) {
			this._command.execute(...args);
		}
		this._offStackCommand.execute(...args);
	}

	_onEnd(evt) {
		if (this._command) {
			this._command.close();
		}
		this._offStackCommand.close();
	}
}

const ResizeWidget = (function(){
	const DEFAULTS = { angle: 0 };

	return class extends BoxWidget {
		constructor(options, resizeOptions) {
			options = extend(DEFAULTS, options);
			super(options);
			this._addOptionGetter("angle");

			this._stack = this._options.stack;
			this._resizeOptions = resizeOptions;
		}

		setResizeOptions(options) {
			this._resizeOptions = extend(this._resizeOptions, options);
		}

		_onClick(mdEvt, muEvt){}

		_onStart(evt) {
			const args = [ this._getMousePosition(evt), 
						   this._angle,
						   this._resizeOptions ];

			if (this._stack) {
				this._command = new ResizeCommand(this._boxes, ...args);
				this._stack.add(this._command);
			}
			this._offStackCommand = new ResizeCommand(this._offStackBoxes, ...args);
		}

		_onMove(evt) {
			const pos = this._getMousePosition(evt),
				  args = [pos, evt.shiftKey, evt.ctrlKey];
			if (this._command) {
				this._command.execute(...args);
			}
			this._offStackCommand.execute(...args);
		}

		_onEnd(evt) {
			if (this._command) {
				this._command.close();
			}
			this._offStackCommand.close();
		}
	};
})();

const RotateWidget = (function(){
	const DEFAULTS = { center: Vector2.zero };

	return class extends BoxWidget {
		constructor(options) {
			options = extend(DEFAULTS, options);
			super(options);
			this._addOptionGetter("center");

			this._stack = this._options.stack;
		}

		_onClick(mdEvt, muEvt){}

		_onStart(evt) {
			const pos = this._center;

			if (this._stack) {
				this._command = new RotateCommand(this._boxes, pos);
				this._stack.add(this._command);
			}
			this._offStackCommand = new RotateCommand(this._offStackBoxes, pos);
		}

		_onMove(evt) {
			const args = [ this._getMousePosition(evt), evt.shiftKey ];

			if (this._command) {
				this._command.execute(...args);
			}
			this._offStackCommand.execute(...args);
		}

		_onEnd(evt) {
			if (this._command) {
				this._command.close();
			}
			this._offStackCommand.close();
		}
	};
})();

const MoveTool = (function(){
	const cl_moveBox = "move-box",
		  cl_background = "move-box__background",
		  cl_testHandle = "move-box__test-handle",
		  cl_resizeHandle = "move-box__resize-handle",
		  RESIZE_DIRECTIONS = ["tl", "tr", "br", "bl"],
		  cl_rotateHandle = "move-box__rotate-handle",
		  cl_rotateConnector = "move-box__rotate-connector";

	return class extends Tool {
		constructor(lm, stack, ui, options) {
			super(lm, stack, ui, options);

			this._updateMoveBox = this._updateMoveBox.bind(this);
			this._updateDOM = this._updateDOM.bind(this);
			this._update = this._update.bind(this);

			this._createBoxes();
			this._createWidgets();
		}

		_createBoxes() {
			const bounds = this._layerManager.parent;

			const d = document.createElement("div");
			d.classList.add(cl_moveBox);
			this._moveBox = new Box(d, bounds);

			const background = document.createElement("div");
			background.classList.add(cl_background);
			d.appendChild(background);

			/*
			const test = document.createElement("div");
			test.classList.add(cl_testHandle);
			bounds.appendChild(test);
			this._testBox = new Box(test, bounds);
			*/

			const connector = document.createElement("div");
			connector.classList.add(cl_rotateConnector);
			d.appendChild(connector);

			const rot = document.createElement("div");
			preventBubble(rot, "mousedown");
			rot.classList.add(cl_rotateHandle);
			d.appendChild(rot);
			this._rotateBox = new Box(rot, bounds);

			this._resizeBoxes = RESIZE_DIRECTIONS.map((dir, i) => {
				const handle = document.createElement("div");
				preventBubble(handle, "mousedown");
				handle.classList.add(cl_resizeHandle, dir);
				d.appendChild(handle);

				return new Box(handle, bounds);
			});
		}

		_createWidgets() {
			const bounds = this._layerManager.viewport;
			this._moveBoxAction = new MouseAction(this._moveBox.element, bounds);

			this._selectWidget = new SelectWidget(this._layerManager);
			this._selectWidget.handle(this._moveBoxAction);

			const boxWidgetOptions = { stack: this._stack,
									   origin: () => this._moveBox.origin,
									   scale: () => this._layerManager.scale,
									   boxes: () => this._layerManager.selected,
									   offStackBoxes: [this._moveBox] };

			this._dragWidget = new DragWidget(boxWidgetOptions);
			this._dragWidget.handle(this._moveBoxAction);

			const rotOptions = extend(boxWidgetOptions, 
				{ center: () => this._moveBox.center.divide(this._layerManager.scale) });
			const rotAction = new MouseAction(this._rotateBox.element, bounds);

			this._rotateWidget = new RotateWidget(rotOptions);
			this._rotateWidget.handle(rotAction);

			this._resizeWidgets = this._resizeBoxes.map((box, i) => {
				const options = extend(boxWidgetOptions, { angle: () => this._moveBox.angle });
				const widget = new ResizeWidget(options,
											  	{ direction: i * 2,
											  	  fixAspectRatio: this._ui.settings.get("fixAspectRatio") });
				this._ui.settings.addListener("fixAspectRatio", (v) => {
					widget.setResizeOptions({fixAspectRatio: v});
				});
				const action = new MouseAction(box.element, bounds); 
				widget.handle(action);
				return widget;
			});
		}

		_updateMoveBox() {
			const selected = this._layerManager.selected;
			if (selected.length) {
				const d = this._moveBox.element;

				if (selected.length > 1) {
					this._moveBox.angle = 0;

					const fitRect = {};
					selected.forEach((layer) => {
						const rect = layer.rect;
						["top", "left", "bottom", "right"].forEach((p, i) => {
							const n = rect[p] / this._layerManager.scale;
							if (isUdf(fitRect[p]) || 
								(i < 2 && n < fitRect[p]) || 
								(i >= 2 && n > fitRect[p])) {
								fitRect[p] = n;
							}
						});
					});

					fitRect.width = fitRect.right - fitRect.left;
					fitRect.height = fitRect.bottom - fitRect.top;
					["top", "left", "width", "height"].forEach((p) => {
						d.style[p] = fitRect[p] + "px";
					});
				} else if (selected.length === 1) {
					const box = selected[0];

					this._moveBox.angle = box.angle;
					["top", "left", "width", "height"].forEach((p) => {
						d.style[p] = box[p] + "px";
					});
				}
			}
		}

		_updateDOM() {
			const d = this._moveBox.element;
			const selected = this._layerManager.selected;
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

		_enable() {
			const layers = this._layerManager.layerMouseAction;
			this._selectWidget.handle(layers);
			this._dragWidget.handle(layers);

			this._layerManager.onSelectedChange.addListener(this._update);
			this._stack.onChange.addListener(this._updateMoveBox);

			this._layerManager.viewport.firstElementChild.appendChild(this._moveBox.element);

			this._update();
		}

		_disable() {
			const layers = this._layerManager.layerMouseAction;
			this._selectWidget.stopHandling(layers);
			this._dragWidget.stopHandling(layers);

			this._layerManager.onSelectedChange.removeListener(this._update);
			this._stack.onChange.removeListener(this._updateMoveBox);

			this._moveBox.element.remove();
		}
	};
})();

const MoveToolUI = (function(){
	const cl_fixAspectRatio = "fix-aspect-ratio";
	const txt_fixAspectRatio = "Keep Aspect Ratio";
	const DEFAULT_SETTINGS = { fixAspectRatio: true };

	return class extends ToolUI {
		constructor() {
			super(DEFAULT_SETTINGS);
		}

		_createUI() {
			const d = document.createElement("div");

			const initValue = this.settings.get("fixAspectRatio");
			const toggle = new Toggle(initValue, { text: txt_fixAspectRatio });
			toggle.onToggle.addListener((b) => {
				this.settings.put("fixAspectRatio", b);
			});
			const t = toggle.root;
			t.classList.add(cl_fixAspectRatio);
			d.appendChild(t);

			return d;
		}
	};
})();
