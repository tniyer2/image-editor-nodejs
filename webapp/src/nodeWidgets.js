
import { isArray } from "./type";
import { show, hide } from "./utility";
import { Command, MultiCommand } from "./command";
import { UserActionHandler } from "./action";
import { DragWidget } from "./boxWidgets";
import { ToggleItemCommand } from "./collectionWidgets";
import { NodeInput, MultiNodeInput, NodeOutput, Link } from "./node";

export { NodeLinkWidget, DragNodeWidget };

class NodeLinkWidget extends UserActionHandler {
	constructor(collection, parent, stack, lock) {
		super();

		this._collection = collection;
		this._parent = parent;
		this._stack = stack;
		this._lock = lock;

		this._link = null;
		this._prevLink = null;
		this._setting = false;
	}

	_onInput(point, isMulti) {
		if (this._setting) {
			if (!this._inputStart && point.node !== this._link.output.node) {
				this._setLink(point, true, isMulti);
			} else {
				this._clear();
			}
		} else {
			this._createLink(point, true, isMulti);
		}
	}

	_onOutput(point) {
		if (this._setting) {
			if (this._inputStart && point.node !== this._link.input.node) {
				this._setLink(point, false, false);
			} else {
				this._clear();
			}
		} else {
			this._createLink(point, false, false);
		}
	}

	_createLink(point, isInput, isMulti) {
		if (this._lock && this._lock.locked) return;

		this._setting = true;
		this._inputStart = isInput;

		if (this._lock) {
			this._lockKey = this._lock.lock();
		}

		this._link = new Link();
		this._parent.element.appendChild(this._link.element);
		this._link.parent = this._parent;

		if (isInput) {
			if (!isMulti) {
				const prev = point.link;
				if (prev) {
					hide(prev.element);
					this._prevLink = prev;
				}
			}
			this._link.input = point;
		} else {
			this._link.output = point;
		}
	}

	_setLink(point, isInput, isMulti) {
		if (isInput) {
			if (this._link.output.type !== point.type) return;
			if (!isMulti) {
				this._prevLink = point.link;
			}
			this._link.input = point;
		} else {
			if (this._link.input.type !== point.type) return;
			this._link.output = point;
		}

		let removeCommand;
		if (this._prevLink) {
			removeCommand = new ToggleItemCommand(
				this._collection, this._prevLink, false);
			this._prevLink = null;
		}

		let c = new ToggleItemCommand(
			this._collection, this._link, true);
		if (removeCommand) {
			c = new MultiCommand([removeCommand, c]);
		}
		if (this._lock) {
			this._lock.free(this._lockKey);
		}
		if (this._stack) {
			this._stack.add(c);
		}
		c.execute();

		this._link.updatePath();
		if (this._link.input instanceof MultiNodeInput) {
			this._link.input.links.forEach((l) => {
				l.updatePath();
			});
		}
		this._link = null;

		this._setting = false;
	}

	_clear(removePrev=true) {
		this._link.element.remove();
		this._link = null;

		if (this._lock) {
			this._lock.free(this._lockKey);
		}

		if (this._prevLink) {
			if (removePrev) {
				const c = new ToggleItemCommand(
					this._collection, this._prevLink, false);
				if (this._stack) {
					this._stack.add(c);
				}
				c.execute();
			}
			show(this._prevLink.element);
			this._prevLink = null;
		}

		this._setting = false;
	}

	_onClick(mdEvt, muEvt, point) {
		if (mdEvt.button !== 0 && muEvt.button !== 0) return;

		if (point instanceof NodeInput) {
			this._onInput(point, false);
		} else if (point instanceof MultiNodeInput) {
			this._onInput(point, true);
		} else if (point instanceof NodeOutput) {
			this._onOutput(point);
		} else if (this._setting) {
			this._clear();
		}
	}

	_onMove(evt, point) {
		if (this._setting) {
			let p = this._getMousePosition(evt);
			if (this._inputStart) {
				this._link.updatePath(null, p);
			} else {
				this._link.updatePath(p, null);
			}
		}
	}

	_onEnd(evt, point) {
		if (this._setting) {
			this._clear();
		}
	}

	_onKeyDown(evt) {
		if (evt.key === "Escape") {
			if (this._setting) {
				this._clear();
			}
		}
	}
}

class UpdateLinkCommand extends Command {
	constructor(nodes) {
		super(Command.CONTINUOUS);

		this._nodes = nodes;
		this._links = this._getLinks();
	}

	_getLinks() {
		let links = this._nodes.map(n => n.links);
		links = [].concat(...links);
		links = Array.from(new Set(links));
		return links;
	}

	_updateLinks() {
		this._links.forEach((l) => {
			l.updatePath();
		});
	}

	_execute() {
		this._updateLinks();
	}

	_close() {
		this._updateLinks();
	}

	_undo() {
		this._updateLinks();
	}

	_redo() {
		this._updateLinks();
	}
}

class DragNodeWidget extends DragWidget {
	_getCommand(boxes, evt) {
		const inherited = super._getCommand(boxes, evt);
		const command = new UpdateLinkCommand(boxes);

		if (isArray(inherited)) {
			inherited.push(command);
			return inherited;
		} else {
			return [inherited, command];
		}
	}
}
