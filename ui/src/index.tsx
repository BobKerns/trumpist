import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './css/index.css';
import App from './tags/App';
import * as serviceWorker from './serviceWorker';
import {Map} from 'immutable';
import configureStore, {INode, ILink} from "./store";
import {Provider} from 'react-redux';
import createBrowserHistory from "history/createBrowserHistory";
import {StoreProvider} from "./tags/Store";
import {actions} from './store';
const {ui, graph} = actions;

const history = createBrowserHistory();
const store = configureStore(history, {});


async function startup() {
    const app = (
        <Provider store={store}>
            <StoreProvider value={store}>
                <App history={history}/>
            </StoreProvider>
        </Provider>
    );

    store.dispatch(ui.init());
    store.dispatch(graph.setConnection(`${location.protocol}://${location.host}/`));

    ReactDOM.render(app, document.getElementById('root'));

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: http://bit.ly/CRA-PWA
    serviceWorker.unregister();
}

startup();
