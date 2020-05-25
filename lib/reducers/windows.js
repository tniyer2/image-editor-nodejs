
import _ from "lodash";
import {
    SPLIT_WINDOW,
    DELETE_WINDOW,
    RIGHT,
    LEFT,
    TOP,
    BOTTOM
} from "./windows-actions.js";

const HORIZONTAL = [LEFT, RIGHT];
const VERTICAL = [TOP, BOTTOM];

function getDefaultState() {
    const ctr = getContainer();
    ctr.childIDs = [1];

    return {
        0: ctr,
        1: getWindow()
    };
}

const getContainer = () => ({
    type: "container",
    childIDs: [],
    row: true
});

const getWindow = () => ({
    type: "window"
});

function splitWindow(state, action) {
    const { childId, direction } = action;
    const child = state[childId];
    const parent = state[child.parentId];
    // split goes with current direction.
    if (parent.row === _.includes(HORIZONTAL, direction)) {

    }
    // split goes against current direction.
    else {

    }
}

export function WindowsReducer(state, action) {
    switch (action.type) {
        case SPLIT_WINDOW:
            return splitWindow(state, action);
        case DELETE_WINDOW:
            return state;
        default:
            return getDefaultState();
    }
}
