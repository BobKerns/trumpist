import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './css/index.css';
import App from './tags/App';
import * as serviceWorker from './serviceWorker';
import {Map} from 'immutable';
import configureStore, {INode, ILink} from "./store";
import {Provider} from 'react-redux';
import createBrowserHistory from "history/createBrowserHistory";
import {actions} from './store';
const {ui} = actions;

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


    const app = <Provider store={store}>
            <App history={history}/>
    </Provider>;

    store.dispatch(ui.init());

    ReactDOM.render(app, document.getElementById('root'));

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: http://bit.ly/CRA-PWA
    serviceWorker.unregister();
}

startup();
