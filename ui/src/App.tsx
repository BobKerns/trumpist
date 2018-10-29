import * as React from 'react';
import {Component} from 'react';
import Logo from './logo.svg';
import './App.css';
import Header from './Header';
import Graph from './Graph';
import {INode, ILink} from "./store";
import {Map} from 'immutable';
import {Router, Route} from 'react-router';
import {History} from "history";

export interface IApp {
    title: string;
    nodes: Map<string, INode>;
    links: Map<string, ILink>;
    start: string;
    history: History<any>;
}

class App extends Component<IApp> {
  public render(): any {
      const anchor = this.props.nodes.get(this.props.start);
      return (
          <Router history={this.props.history}>
              <div className="App">
                  <header className="App-header">
                      <Header title={this.props.title}/>
                  </header>
                  <Route>
                      <Graph
                          anchor={anchor}
                          nodes={this.props.nodes}
                          links={this.props.links}
                          width={"100%"} height="calc(100% - 3rem)"
                      />
                  </Route>s
              </div>
          </Router>
    );
  }
}

export default App;
