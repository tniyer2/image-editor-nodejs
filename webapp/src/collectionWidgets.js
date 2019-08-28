
import { MultiCommand, Command } from "./command";
import { UserActionHandler } from "./action";

export { SelectWidget, ToggleItemCommand, DeleteWidget };

class SelectWidget extends UserActionHandler {
	constructor(collection) {
		super();
		this._collection = collection;
	}

	_onClick(mdEvt, muEvt, item) {
		if (item) {
			const ctrl = mdEvt.ctrlKey,
				  shift = mdEvt.shiftKey;

			if (ctrl && item.selected) {
				this._collection.deselect(item);
			} else if (shift && !item.selected) {
				this._collection.select(item);
			} else if (!ctrl && !shift) {
				this._collection.selectOnly(item);
			}
		}
	}

	_onStart(evt, item) {
		if (item && !item.selected) {
			if (evt.shiftKey) {
				this._collection.select(item);
			} else {
				this._collection.selectOnly(item);
			}
		}
	}
}

class ToggleItemCommand extends Command {
	constructor(collection, item, add, addName="add", removeName="remove") {
		super(Command.IMMEDIATE);

		this._collection = collection;
		this._item = item;
		this._add = add;
		this._addName = addName;
		this._removeName = removeName;
	}

	_toggle(b) {
		if (this._add === b) {
			this._collection[this._addName](this._item);
		} else {
			this._collection[this._removeName](this._item);
		}
	}

	_execute() {
		this._toggle(true);
	}

	_undo() {
		this._toggle(false);
	}

	_redo() {
		this._toggle(true);
	}
}

class DeleteWidget extends UserActionHandler {
	constructor(collections, stack) {
		super();

		this._collections = collections;
		this._stack = stack;
	}

	_onKeyUp(evt) {
		if (evt.key !== "Delete") return;

		let commands = this._collections.map((cln) => {
			return cln.selected.map((item) => {
				return new ToggleItemCommand(cln, item, false);
			});
		});
		commands = [].concat(...commands);
		const all = new MultiCommand(commands);

		if (this._stack) {
			this._stack.add(all);
		}
		all.execute();
	}
}
