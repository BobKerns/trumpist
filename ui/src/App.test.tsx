import * as ReactDOM from 'react-dom';
import App from "./App";
import * as React from 'react';
import {INode} from "./Node";
import {Map} from 'immutable';
import {ILink} from "./Link";

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(
      <App title="testttt"
           nodes={Map<string, INode>()}
           links={Map<string, ILink>()}
           start="testttt"
      />, div);
  ReactDOM.unmountComponentAtNode(div);
});
