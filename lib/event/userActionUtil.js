
import { ActionHandler,
		 ActionPiper,
		 ActionBridge } from "./actionUtil";
import MouseAction from "./mouseAction";
import KeyAction from "./keyAction";

export { UserActionHandler,
		 UserActionPiper,
		 UserActionBridge };

const ACTIONS = [ MouseAction, KeyAction ];

class UserActionHandler extends ActionHandler {
	constructor() {
		super(ACTIONS);
	}
}

class UserActionPiper extends ActionPiper {
	constructor() {
		super(ACTIONS);
	}
}

class UserActionBridge extends ActionBridge {
	constructor() {
		super(ACTIONS);
	}
}
