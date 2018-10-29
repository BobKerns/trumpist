import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {Map} from 'immutable';
import configureStore, {INode, ILink} from "./store";
import {Provider} from 'react-redux';
import createBrowserHistory from "history/createBrowserHistory";

const history = createBrowserHistory();
const store = configureStore(history, {});


async function startup() {
    const telt = document.getElementsByTagName('title')[0];
    let title = telt.text;
    store.subscribe(() => {
        const state = store.getState();
        const ntitle = state.ui.title;
        if (ntitle !== title) {
            telt.text = ntitle;
            title = ntitle;
        }
    });

    const req = await fetch('http://localhost:3001/api/v1/start');
    const json = await req.json();
    telt.text = title;

    const app = <Provider store={store}>
            <App
            title={title}
            nodes={Map<string, INode>(json.nodes)}
            links={Map<string, ILink>(json.links)}
            start={json.start}
            history={history}
        />
    </Provider>;

    ReactDOM.render(app, document.getElementById('root'));

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: http://bit.ly/CRA-PWA
    serviceWorker.unregister();
}

startup();
