
import Head from "next/head";
import { useEffect } from "react";

import css from "./index.scss";
import Editor from "comp/editor.js";

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
