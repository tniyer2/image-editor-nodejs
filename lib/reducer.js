
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
		case PUSH_COMMAND:
			state = copyHistory(state);
			state.past = state.past.slice();
			state.past.push(action.command);
			state.future = [];
			state.temp = [];
			break;
		case START_TEMP_COMMAND:
			if (state.temp.length === 0) {
				state = copyHistory(state);
				state.temp = [action.command];
			}
			break;
		case PUSH_TEMP_COMMAND:
			if (state.temp.length !== 0) {
				state = copyHistory(state);
				state.temp = state.temp.slice();
				state.temp.push(action.command);
			}
			break;
		case CLEAR_TEMP_COMMAND:
			if (state.temp.length !== 0) {
				state = copyHistory(state);
				state.temp = [];
			}
			break;
		case FLUSH_TEMP_COMMAND:
			if (state.temp.length !== 0) {
				state = copyHistory(state);
				const start = state.temp[0];
				const newCommand =
					start.genCommand(state.temp.slice(1));
				state.temp = [];
				state.past = state.past.slice();
				state.past.push(newCommand);
				state.future = [];
			}
			break;
		case MOVE_FORWARD:
			if (state.future.length > 0) {
				state = copyHistory(state);
				const next = state.future[0];
				state.future = state.future.slice(1);
				state.past = state.past.slice();
				state.past.push(next);
			}
			break;
		case MOVE_BACKWARD:
			const len = state.past.length;
			if (len > 0) {
				state = copyHistory(state);
				const cur = state.past[len-1];
				state.past = state.past.slice(0, len-1);
				state.future = state.future.slice();
				state.future.unshift(cur);
			}
			break;
		default:
			state = getDefaultHistory();
	}
	return state;
}

export default combineReducers({ history });
