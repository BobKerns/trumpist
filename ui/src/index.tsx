import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {Map} from 'immutable';
import {INode} from "./Node";

async function startup() {
    const req = await fetch('http://localhost:3001/');
    const json = await req.json();
    const title = json.title || 'UNKNOWN';
    const telt = document.getElementsByTagName('title')[0];
    telt.text = title;

    const app = <App
        title={title}
        nodes={Map<string, INode>(json.nodes)}
        start={json.start}
    />;

    ReactDOM.render(app, document.getElementById('root'));

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: http://bit.ly/CRA-PWA
    // serviceWorker.unregister();
}

startup();
