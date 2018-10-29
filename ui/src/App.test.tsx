import * as ReactDOM from 'react-dom';
import App from "./App";
import * as React from 'react';
import {INode, ILink} from "./store";
import {Map} from 'immutable';
import createBrowserHistory from "history/createBrowserHistory";

const history = createBrowserHistory();

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(
      <App title="testttt"
           history={history}
           nodes={Map<string, INode>()}
           links={Map<string, ILink>()}
           start="testttt"
      />, div);
  ReactDOM.unmountComponentAtNode(div);
});
