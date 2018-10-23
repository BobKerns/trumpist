import * as ReactDOM from 'react-dom';
import App from "./App";
import * as React from 'react';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
  ReactDOM.unmountComponentAtNode(div);
});
