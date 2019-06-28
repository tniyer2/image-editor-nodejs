
import { extend, show, hide, preventBubble } from "./utility";
import { Vector2, Box } from "./geometry";
import { MouseAction } from "./action";
import { DragCommand, ResizeCommand, RotateCommand } from "./transformCommands";
import { BoxWidget, SelectWidget } from "./widget";
import { Tool } from "./tool";
import { ToolUI } from "./toolUI";
import { Toggle } from "./input";

export { MoveTool, MoveToolUI, DragWidget };

class DragWidget extends BoxWidget {
	constructor(options, dragOptions) {
		super(options);
		this._dragOptions = dragOptions;
	}

	_onClick(mdEvt, muEvt){}

	_onStart(evt) {
		const args = [ this._getMousePosition(evt), 
					   this._dragOptions ];

		if (this._options.get("stack")) {
			this._command = new DragCommand(this._options.get("boxes"), ...args);
			this._options.get("stack").add(this._command);
		}
		this._offStackCommand = new DragCommand(this._options.get("offStackBoxes"), ...args);
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
			this._resizeOptions = resizeOptions;
		}

		setResizeOptions(options) {
			this._resizeOptions = extend(this._resizeOptions, options);
		}

		_onClick(mdEvt, muEvt){}

		_onStart(evt) {
			const args = [ this._getMousePosition(evt), 
						   this._options.get("angle"),
						   this._resizeOptions ];

			if (this._options.get("stack")) {
				this._command = new ResizeCommand(this._options.get("boxes"), ...args);
				this._options.get("stack").add(this._command);
			}
			this._offStackCommand = new ResizeCommand(this._options.get("offStackBoxes"), ...args);
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
		}

		_onClick(mdEvt, muEvt){}

		_onStart(evt) {
			const pos = this._options.get("center");

			if (this._options.get("stack")) {
				this._command = new RotateCommand(this._options.get("boxes"), pos);
				this._options.get("stack").add(this._command);
			}
			this._offStackCommand = new RotateCommand(this._options.get("offStackBoxes"), pos);
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
		  // cl_testHandle = "move-box__test-handle",
		  cl_resizeHandle = "move-box__resize-handle",
		  RESIZE_DIRECTIONS = ["tl", "tr", "br", "bl"],
		  cl_rotateHandle = "move-box__rotate-handle",
		  cl_rotateConnector = "move-box__rotate-connector";

	return class extends Tool {
		constructor(lm, stack, options) {
			super(lm, stack, options);

			this._updateMoveBox = this._updateMoveBox.bind(this);
			this._updateDOM = this._updateDOM.bind(this);
			this._update = this._update.bind(this);

			this._createBoxes();
			this._createWidgets();
		}

		_createBoxes() {
			const parent = this._layerManager.innerViewport;

			const d = document.createElement("div");
			d.classList.add(cl_moveBox);
			this._moveBox = new Box(d, parent);

			const background = document.createElement("div");
			background.classList.add(cl_background);
			d.appendChild(background);

			/*
			const test = document.createElement("div");
			test.classList.add(cl_testHandle);
			parent.appendChild(test);
			this._testBox = new Box(test, parent);
			*/

			const connector = document.createElement("div");
			connector.classList.add(cl_rotateConnector);
			d.appendChild(connector);

			const rot = document.createElement("div");
			preventBubble(rot, "mousedown");
			rot.classList.add(cl_rotateHandle);
			d.appendChild(rot);
			this._rotateBox = new Box(rot, parent);

			this._resizeBoxes = RESIZE_DIRECTIONS.map((dir) => {
				const handle = document.createElement("div");
				preventBubble(handle, "mousedown");
				handle.classList.add(cl_resizeHandle, dir);
				d.appendChild(handle);

				return new Box(handle, parent);
			});
		}

		_createWidgets() {
			const bounds = this._layerManager.viewport.element;
			this._moveBoxAction = new MouseAction(this._moveBox.element, bounds);

			this._selectWidget = new SelectWidget(this._layerManager);
			this._selectWidget.handle(this._moveBoxAction);

			const boxWidgetOptions = { stack: this._stack,
									   boxes: () => this._layerManager.selected,
									   offStackBoxes: [this._moveBox] };

			this._dragWidget = new DragWidget(boxWidgetOptions);
			this._dragWidget.handle(this._moveBoxAction);

			const rotOptions = extend(boxWidgetOptions, 
							   { center: () => this._moveBox.center });
			const rotAction = new MouseAction(this._rotateBox.element, bounds);

			this._rotateWidget = new RotateWidget(rotOptions);
			this._rotateWidget.handle(rotAction);

			this._resizeWidgets = this._resizeBoxes.map((box, i) => {
				const options = extend(boxWidgetOptions, { angle: () => this._moveBox.angle });
				const options2 = { direction: i * 2,
								   fixAspectRatio: this._options.get("fixAspectRatio") };
				const widget = new ResizeWidget(options, options2);
				this._options.addListener("fixAspectRatio", (v) => {
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
				  selected = this._layerManager.selected;
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

			this._layerManager.viewport.element.firstElementChild.appendChild(this._moveBox.element);

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

	return class extends ToolUI {
		constructor(settings, globals) {
			super();
			this._settings = settings;
			this._globals = globals;
		}

		_createUI() {
			const d = document.createElement("div");

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
