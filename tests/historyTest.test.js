
import { createStore } from "redux";
import reducer from "../lib/reducer";
import {
	PUSH_COMMAND,
	START_TEMP_COMMAND,
	PUSH_TEMP_COMMAND,
	CLEAR_TEMP_COMMAND,
	FLUSH_TEMP_COMMAND,
	MOVE_FORWARD,
	MOVE_BACKWARD
} from "../lib/actions";

const store = createStore(reducer);

const history = () => store.getState().history;

const AddCommand = {
	genCommand: (a) => a.reduce((a, b) => a + b, 0)
};

test("Testing history reducer.", () => {
	expect(history()).toEqual({
		future: [],
		past: [],
		temp: []
	});

	const STATE_1 = {
		future: [],
		past: ["create node"],
		temp: []
	};
	store.dispatch({ type: PUSH_COMMAND, command: "create node" });
	expect(history()).toEqual(STATE_1);
	store.dispatch({ type: MOVE_BACKWARD });
	expect(history()).toEqual({
		future: ["create node"],
		past: [],
		temp: []
	});
	store.dispatch({ type: MOVE_FORWARD });
	expect(history()).toEqual(STATE_1);

	store.dispatch({ type: PUSH_COMMAND, command: "create prop" });
	expect(history()).toEqual({
		future: [],
		past: ["create node", "create prop"],
		temp: []
	});

	store.dispatch({ type: PUSH_COMMAND, command: "stroke" });
	store.dispatch({ type: MOVE_BACKWARD });

	expect(history()).toEqual({
		future: ["stroke"],
		past: ["create node", "create prop"],
		temp: []
	});

	store.dispatch({ type: PUSH_COMMAND, command: "stroke" });
	store.dispatch({ type: PUSH_COMMAND, command: "stroke" });

	store.dispatch({ type: START_TEMP_COMMAND, command: AddCommand });

	expect(history()).toEqual({
		future: [],
		past: ["create node", "create prop", "stroke", "stroke"],
		temp: [AddCommand]
	});

	store.dispatch({ type: PUSH_TEMP_COMMAND, command: 1 });
	store.dispatch({ type: PUSH_TEMP_COMMAND, command: 5 });
	store.dispatch({ type: PUSH_TEMP_COMMAND, command: -1 });

	expect(history()).toEqual({
		future: [],
		past: ["create node", "create prop", "stroke", "stroke"],
		temp: [AddCommand, 1, 5, -1]
	});

	store.dispatch({ type: FLUSH_TEMP_COMMAND });
	expect(history()).toEqual({
		future: [],
		past: ["create node", "create prop", "stroke", "stroke", 5],
		temp: []
	});

	store.dispatch({ type: START_TEMP_COMMAND, command: AddCommand });
	store.dispatch({ type: PUSH_TEMP_COMMAND, command: 7 });

	expect(history()).toEqual({
		future: [],
		past: ["create node", "create prop", "stroke", "stroke", 5],
		temp: [AddCommand, 7]
	});

	for (let i=0; i<5; ++i) {
		store.dispatch({ type: MOVE_BACKWARD });
	}
	store.dispatch({ type: CLEAR_TEMP_COMMAND });
	expect(history()).toEqual({
		future: ["create node", "create prop", "stroke", "stroke", 5],
		past: [],
		temp: []
	});
});
