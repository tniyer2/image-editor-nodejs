
import css from "./download-button.scss";

export function DownloadButton() {
    const downloadImage = (e) => {
    };

    return (
    <button type="button" onClick={downloadImage}
        className={css.downloadBtn}>
        <span>Download</span>
    </button>);
}
