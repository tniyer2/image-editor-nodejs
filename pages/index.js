
import Head from "next/head";
import { useEffect } from "react";

import { Editor } from "comp/editor.js";
import css from "./index.scss";

export default function Index() {
    useEffect(() => {
        // window.onbeforeunload = () => true;
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
