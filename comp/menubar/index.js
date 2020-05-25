
import { DownloadButton } from "./download-button";
import { UndoRedo } from "./undo-redo";

import css from "./index.scss";

export function MenuBar() {
    return (
    <div className={css.menubar}>
        <DownloadButton/>
        <UndoRedo/>
    </div>);
}
