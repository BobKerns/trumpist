/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as ReactDOM from 'react-dom';
import App from "../App";
import * as React from 'react';
import {INode, ILink, State, NodeState, IView, LayoutState} from "../../store";
import {Map} from 'immutable';
import createBrowserHistory from "history/createBrowserHistory";
import {Provider} from "react-redux";
import configureStore from "../../store/store";
import {createMemoryHistory} from "history";
import {LinkState} from "../Link";
import {string} from "prop-types";

const history = createBrowserHistory();

it('renders without crashing', () => {
  const div = document.createElement('div');
  const state: State = {
      ui: {
          title: 'goo',
          loading: 0,
          error: null,
          layoutStates: Map<string, LayoutState>(),
      },
      app: {
          connection: "test",
      },
      graph: Map<string, IView>(),
  };

  const store = configureStore(createMemoryHistory(), state);
  ReactDOM.render(
      <Provider store={store}>
          <App
               history={history}
          />
      </Provider>,
      div);
  ReactDOM.unmountComponentAtNode(div);
});
