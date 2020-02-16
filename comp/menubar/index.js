
import css from "./index.scss";
import DownloadButton from "./downloadButton";
import UndoRedo from "./undoRedo";

export default function MenuBar() {
    return (
    <div className={css.menubar}>
        <DownloadButton/>
        <UndoRedo/>
    </div>);
}
