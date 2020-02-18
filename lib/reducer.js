
import { combineReducers } from "redux";
import {
	PUSH_COMMAND,
	START_TEMP_COMMAND,
	PUSH_TEMP_COMMAND,
	CLEAR_TEMP_COMMAND,
	FLUSH_TEMP_COMMAND,
	MOVE_FORWARD,
	MOVE_BACKWARD
} from "./actions";

function getDefaultHistory() {
	return {
		past: [],
		future: [],
		temp: []
	};
}

function copyHistory(state) {
	return Object.assign({}, state);
}

function history(state, action) {
	switch (action.type) {
		// pushes to past. future and temp are cleared.
		case PUSH_COMMAND:
			state = copyHistory(state);
			state.past = state.past.slice();
			state.past.push(action.command);
			state.future = [];
			state.temp = [];
			return state;
		// starts a temporary chain of commands.
		// ignores if temp already exists.
		case START_TEMP_COMMAND:
			if (state.temp.length === 0) {
				state = copyHistory(state);
				state.temp = [action.command];
			}
			return state;
		// pushes a command to temp if chain exists.
		// ignores if temp chain doesn't exist.
		case PUSH_TEMP_COMMAND:
			if (state.temp.length !== 0) {
				state = copyHistory(state);
				state.temp = state.temp.slice();
				state.temp.push(action.command);
			}
			return state;
		// clears temp
		case CLEAR_TEMP_COMMAND:
			if (state.temp.length !== 0) {
				state = copyHistory(state);
				state.temp = [];
			}
			return state;
		// Passes chain to the starting command
		// to generate a compiled command.
		// Then same behavior as PUSH_COMMAND
		// Ignores if temp chain doesn't exist.
		case FLUSH_TEMP_COMMAND:
			if (state.temp.length !== 0) {
				state = copyHistory(state);
				const start = state.temp[0];
				const rest = state.temp.slice(1);
				const reduced = start.genCommand(rest);

				state.past = state.past.slice();
				state.past.push(reduced);

				state.temp = [];
				state.future = [];
			}
			return state;
		// Pushes a command from future to past and clears temp.
		case MOVE_FORWARD:
			if (state.future.length > 0) {
				state = copyHistory(state);
				const next = state.future[0];
				state.future = state.future.slice(1);
				state.past = state.past.slice();
				state.past.push(next);
				state.temp = [];
			}
			return state;
		// Pushes a command from past to future and clears temp.
		case MOVE_BACKWARD:
			const len = state.past.length;
			if (len > 0) {
				state = copyHistory(state);
				const cur = state.past[len-1];
				state.past = state.past.slice(0, len-1);
				state.future = state.future.slice();
				state.future.unshift(cur);
				state.temp = [];
			}
			return state;
		default:
			return getDefaultHistory();
	}
}

export default combineReducers({ history });
