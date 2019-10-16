
import { show, hide, stopBubbling } from "../util/util";
import Box from "../vector/box";
import MouseAction from "../event/mouseAction";
import { SelectWidget } from "../widgets/collectionWidgets";
import { DragWidget, ResizeWidget, RotateWidget } from "./boxWidgets";
import { TransformDragWidget, 
		 TransformScaleWidget, 
		 TransformRotateWidget } from "./transformWidgets";

const CLASSES = {
	moveBox: "move-box",
	background: "move-box__background",
	resizeHandle: "move-box__resize-handle",
	rotateHandle: "move-box__rotate-handle",
	rotateConnector: "move-box__rotate-connector"
};

const BOUND_FUNCTIONS = ["_updateMoveBox", "_updateDOM", "_update"],
	  RESIZE_DIRECTIONS = ["tl", "tr", "br", "bl"];

export default class {
	constructor(collection, stack, parent, offsetParent, bounds) {
		this._collection = collection;
		this._stack = stack;
		this._parent = parent;
		this._offsetParent = offsetParent;
		this._bounds = bounds;

		this._enabled = false;

		BOUND_FUNCTIONS.forEach((n) => {
			this[n] = this[n].bind(this);
		});

		this._createMoveBox();
		this._createWidgets();
	}

	get enabled() {
		return this._enabled;
	}

	_createMoveBox() {
		const d = document.createElement("div");
		d.classList.add(CLASSES.moveBox);
		this._moveBox = new Box(d, this._offsetParent);
		// this._moveBox.setOriginCenter();

		const background = document.createElement("div");
		background.classList.add(CLASSES.background);
		d.appendChild(background);

		const connector = document.createElement("div");
		connector.classList.add(CLASSES.rotateConnector);
		d.appendChild(connector);

		const rot = document.createElement("div");
		stopBubbling(rot, "mousedown");
		rot.classList.add(CLASSES.rotateHandle);
		d.appendChild(rot);
		this._rotateBox = new Box(rot, this._offsetParent);

		this._resizeBoxes = RESIZE_DIRECTIONS.map((dir) => {
			const handle = document.createElement("div");
			stopBubbling(handle, "mousedown");
			handle.classList.add(CLASSES.resizeHandle, dir);
			d.appendChild(handle);

			return new Box(handle, this._offsetParent);
		});
	}

	_createWidgets() {
		this._moveBoxAction =
			new MouseAction(this._moveBox.element, this._bounds);

		this._selectWidget =
			new SelectWidget(this._collection);
		this._selectWidget.handle(this._moveBoxAction);

		const groups = [{ boxes: [this._moveBox] }];

		this._tDragWidget =
			new TransformDragWidget(this._collection, this._stack);
		this._tDragWidget.handle(this._moveBoxAction);

		this._dragWidget =
			new DragWidget(groups);
		this._dragWidget.handle(this._moveBoxAction);

		const rotateBoxAction =
			new MouseAction(this._rotateBox.element, this._bounds);

		const rotateOptions = { center: () => this._moveBox.center };

		this._tRotateWidget =
			new TransformRotateWidget(
				this._collection,
				this._stack,
				rotateOptions);
		this._tRotateWidget.handle(rotateBoxAction);

		this._rotateWidet =
			new RotateWidget(groups, rotateOptions);
		this._rotateWidet.handle(rotateBoxAction);

		this._resizeActions = this._resizeBoxes.map((box) =>
			new MouseAction(box.element, this._bounds)
		);

		this._tResizeWidgets = this._resizeActions.map((action, i) => {
			const options = {
				angle: () => this._moveBox.angle,
				direction: i * 2 };

			const widget =
				new TransformScaleWidget(
					this._collection, this._stack, options);

			widget.handle(action);

			return widget;
		});

		this._resizeWidgets = this._resizeActions.map((action, i) => {
			const options = {
				angle: () => this._moveBox.angle,
				direction: i * 2,
				fixAspectRatio: () => this._tResizeWidgets[i].fixAspectRatio };

			const widget = new ResizeWidget(groups, options);

			widget.handle(action);

			return widget;
		});
	}

	_updateDOM() {
		const d = this._moveBox.element;
		if (this._collection.selected.length) {
			show(d);
		} else {
			hide(d);
		}
	}

	_updateMoveBox() {
		const selected = this._collection.selected;
		if (!selected.length) return;

		let bb;
		const boxes = selected.map(l => l.box);
		if (selected.length > 1) {
			this._moveBox.angle = 0;
			bb = Box.getBoundingBox(boxes);
		} else {
			const box = boxes[0];
			this._moveBox.angle = box.angle;
			bb = box;
		}

		["top", "left", "width", "height"].forEach((p) => {
			this._moveBox[p] = bb[p];
		});
	}

	_update() {
		this._updateDOM();
		this._updateMoveBox();
	}

	enable(node) {
		if (this._enabled) {
			return;
		} else {
			this._enabled = true;
		}

		const action = this._collection.action;
		this._selectWidget.handle(action);
		this._tDragWidget.handle(action);
		this._dragWidget.handle(action);

		this._tDragWidget.node = node;
		this._tRotateWidget.node = node;
		this._tResizeWidgets.forEach((w) => {
			w.node = node;
		});

		this._collection.onSelectedChange.addListener(this._update);
		this._stack.onChange.addListener(this._updateMoveBox);

		this._parent.appendChild(this._moveBox.element);

		this._update();
	}

	disable() {
		if (this._enabled) {
			this._enabled = false;
		} else {
			return;
		}

		const action = this._collection.action;
		this._selectWidget.stopHandling(action);
		this._tDragWidget.stopHandling(action);
		this._dragWidget.stopHandling(action);

		this._tDragWidget.node = null;
		this._tRotateWidget.node = null;
		this._tResizeWidgets.forEach((w) => {
			w.node = null;
		});

		this._collection.onSelectedChange.removeListener(this._update);
		this._stack.onChange.removeListener(this._updateMoveBox);

		this._moveBox.element.remove();
	}
}
