
import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { IconRedo, IconUndo } from "components/icons";

function DownloadButton() {
    const downloadImage = (e) => {
    };

    return (
    <button type="button" onClick={downloadImage}>
        <span>Download</span>
    </button>);
}

function UndoButton() {
    return (
    <button type="button" disabled>
        <IconUndo/>
    </button>);
}

function RedoButton() {
    return (
    <button type="button" disabled>
        <IconRedo/>
    </button>);
}

function MenuBar() {
    return (
    <div className="menubar">
        <DownloadButton/>
        <UndoButton/>
        <RedoButton/>
    </div>);
}

function EditorContent() {
    return (
        <div className="editor-content"></div>);
}

function Editor() {
    return (
    <div className="editor">
        <MenuBar/>
        <EditorContent/>
    </div>);
}

export default function Index() {
    useEffect(() => {
        window.onbeforeunload = () => true;
    }, []);

    return (
    <>
        <Head>
            <title>Image Editor</title>	
            <meta charSet="UTF-8"/>
        </Head>
        <Editor/>
    </>);
}
