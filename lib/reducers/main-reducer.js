
import { combineReducers } from "redux";
import { WindowsReducer } from "./windows.js";
import { HistoryReducer } from "./history.js";

export const MainReducer = combineReducers({
	windows: WindowsReducer,
	history: HistoryReducer
});
