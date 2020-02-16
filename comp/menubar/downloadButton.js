
import css from "./downloadButton.scss";

export default function DownloadButton() {
    const downloadImage = (e) => {
    };

    return (
    <button type="button" onClick={downloadImage}
        className={css.downloadBtn}>
        <span>Download</span>
    </button>);
}
