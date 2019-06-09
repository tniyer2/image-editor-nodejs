
import Enforcer from "./enforcer";
import { preventBubble, show, hide, forEach, addGetter, extend, isUdf } from "./utility";
import { Box, Vector2 } from "./geometry";
import { MouseAction } from "./event";
import { Tool } from "./tool";
import { DragCommand, ResizeCommand, RotateCommand } from "./transformCommands";
import { Widget, SelectWidget } from "./widget";

export { MoveTool };

const TransformWidget = (function(){
	const DEFAULTS = { boxes: () => [], offStackBoxes: () => [] };

	return class extends Widget {
		constructor(stack, options) {
			options = extend(DEFAULTS, options);
			super(options);

			let ef = new Enforcer(TransformWidget, this, "TransformWidget");
			ef.enforceAbstract();

			this._stack = stack;
		}

		_getBoxes() {
			return this._evaluate(this._options.boxes);
		}

		_getOffStackBoxes() {
			return this._evaluate(this._options.offStackBoxes);
		}

		_getMousePosition(evt) {
			const mousePosition = super._getMousePosition(evt);
			return mousePosition.subtract(this._getOrigin()).multiply(this._getScale());
		}

		_onClick(mdEvt, muEvt){}

		_onEnd(evt) {
			this._command.close();
			this._offStackCommand.close();
		}
	};
})();

class DragWidget extends TransformWidget {
	constructor(stack, options, dragOptions) {
		super(stack, options);
		this._dragOptions = dragOptions;
	}

	_onStart(evt) {
		const args = [ this._getMousePosition(evt), this._dragOptions ];
		this._command = new DragCommand(this._getBoxes(), ...args);
		this._stack.add(this._command);
		this._offStackCommand = new DragCommand(this._getOffStackBoxes(), ...args);
	}

	_onMove(evt) {
		const args = [ this._getMousePosition(evt), evt.shiftKey, evt.ctrlKey ];
		this._command.execute(...args);
		this._offStackCommand.execute(...args);
	}
}

const ResizeWidget = (function(){
	const DEFAULTS = { angle: 0 };

	return class extends TransformWidget {
		constructor(stack, options, resizeOptions) {
			options = extend(DEFAULTS, options);
			super(stack, options);
			this._resizeOptions = resizeOptions;
		}

		setResizeOptions(options) {
			this._resizeOptions = extend(this._resizeOptions, options);
		}

		_onStart(evt) {
			const args = [ this._getMousePosition(evt), 
						   this._evaluate(this._options.angle),
						   this._resizeOptions ];
			this._command = new ResizeCommand(this._getBoxes(), ...args);
			this._stack.add(this._command);
			this._offStackCommand = new ResizeCommand(this._getOffStackBoxes(), ...args);
		}

		_onMove(evt) {
			const pos = this._getMousePosition(evt);
			const args = [pos, evt.shiftKey, evt.ctrlKey];
			this._command.execute.apply(this._command, args);
			this._offStackCommand.execute.apply(this._offStackCommand, args);
		}
	};
})();

const RotateWidget = (function(){
	const DEFAULTS = { center: Vector2.zero };
	return class extends TransformWidget {
		constructor(stack, options) {
			options = extend(DEFAULTS, options);
			super(stack, options);
		}

		_onStart(evt) {
			const pos = this._evaluate(this._options.center);
			this._command = new RotateCommand(this._getBoxes(), pos);
			this._stack.add(this._command);
			this._offStackCommand = new RotateCommand(this._getOffStackBoxes(), pos);
		}

		_onMove(evt) {
			const args = [ this._getMousePosition(evt), evt.shiftKey ];
			this._command.execute(...args);
			this._offStackCommand.execute(...args);
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
		constructor(lm, stack, options) {
			super(lm, stack, options);

			this._updateMoveBox = this._updateMoveBox.bind(this);
			this._updateDOM = this._updateDOM.bind(this);
			this._update = this._update.bind(this);

			this._createBoxes();
			this._createWidgets();
		}

		_createBoxes() {
			const bounds = this._layerManager.viewport;

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
			this._selectWidget = new SelectWidget(this._layerManager, this._stack);
			this._selectWidget.handle(new MouseAction(this._moveBox));

			const boxWidgetOptions = { boxes: () => this._layerManager.selected,
									   offStackBoxes: [this._moveBox],
									   origin: () => this._moveBox.origin,
									   scale: () => this._layerManager.inverseScale };

			this._dragWidget = new DragWidget(this._stack, boxWidgetOptions);
			this._dragWidget.handle(new MouseAction(this._moveBox));

			const rotateWidgetOptions = extend(boxWidgetOptions, { center: () => this._moveBox.center.multiply(this._layerManager.inverseScale) });
			this._rotateWidget = new RotateWidget(this._stack, rotateWidgetOptions);
			this._rotateWidget.handle(new MouseAction(this._rotateBox));

			this._resizeWidgets = this._resizeBoxes.map((box, i) => {
				const options = extend(boxWidgetOptions, { angle: () => this._moveBox.angle });
				const widget = new ResizeWidget(this._stack,
											  	options,
											  	{ direction: i * 2,
											  	  fixAspectRatio: false });
				widget.handle(new MouseAction(box));
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
							const n = rect[p] * this._layerManager.inverseScale;
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
