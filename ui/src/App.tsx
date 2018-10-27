import * as React from 'react';
import {Component} from 'react';
import Logo from './logo.svg';
import './App.css';
import Header from './Header';
import Graph from './Graph';
import {INode} from "./Node";
import {ILink} from "./Link";
import {Map} from 'immutable';

export interface IApp {
    title: string;
    nodes: Map<string, INode>;
    links: Map<string, ILink>;
    start: string;
}

class App extends Component<IApp> {
  public render(): any {
      const anchor = this.props.nodes.get(this.props.start);
      return (
          <div className="App">
              <header className="App-header">
                  <Header title={this.props.title}/>
              </header>
              <Graph anchor={anchor} nodes={this.props.nodes} links={this.props.links} width={"100%"} height="calc(100% - 3rem)"/>
          </div>
    );
  }
}

export default App;
