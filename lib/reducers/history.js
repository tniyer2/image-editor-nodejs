
import _ from "lodash";
import {
	PUSH_COMMAND,
	START_TEMP_COMMAND,
	PUSH_TEMP_COMMAND,
	CLEAR_TEMP_COMMAND,
	FLUSH_TEMP_COMMAND,
	MOVE_FORWARD,
	MOVE_BACKWARD
} from "./history-actions.js";

const getDefaultHistory = () => ({
	past: [],
	future: [],
	temp: []
});

export function HistoryReducer(state, action) {
	switch (action.type) {
	// pushes to past. future and temp are cleared.
	case PUSH_COMMAND:
		state = _.clone(state);
		state.past = _.concat(state.past, action.command);
		state.future = [];
		state.temp = [];
		return state;
	// starts a temporary chain of commands.
	// ignores if temp already exists.
	case START_TEMP_COMMAND:
		if (state.temp.length === 0) {
			state = _.clone(state);
			state.temp = [action.command];
		}
		return state;
	// pushes a command to temp if chain exists.
	// ignores if temp chain doesn't exist.
	case PUSH_TEMP_COMMAND:
		if (state.temp.length !== 0) {
			state = _.clone(state);
			state.temp = _.concat(state.temp, action.command);
		}
		return state;
	// clears temp
	case CLEAR_TEMP_COMMAND:
		if (state.temp.length !== 0) {
			state = _.clone(state);
			state.temp = [];
		}
		return state;
	// Passes chain to the starting command
	// to generate a compiled command.
	// Then same behavior as PUSH_COMMAND
	// Ignores if temp chain doesn't exist.
	case FLUSH_TEMP_COMMAND:
		if (state.temp.length !== 0) {
			state = _.clone(state);
			const command =
				_.first(state.temp)
					.genCommand(_.tail(state.temp));
			state.past = _.concat(state.past, command);
			state.future = [];
			state.temp = [];
		}
		return state;
	// Pushes a command from future to past and clears temp.
	case MOVE_FORWARD:
		if (state.future.length !== 0) {
			state = _.clone(state);
			state.past = _.concat(state.past, _.first(state.future));
			state.future = _.tail(state.future);
			state.temp = [];
		}
		return state;
	// Pushes a command from past to future and clears temp.
	case MOVE_BACKWARD:
		if (state.past.length !== 0) {
			state = _.clone(state);
			state.future =
				_.concat(_.last(state.past), state.future);
			state.past = _.initial(state.past);
			state.temp = [];
		}
		return state;
	default:
		return getDefaultHistory();
	}
}
