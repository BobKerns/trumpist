/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import {Component} from 'react';
import Logo from './logo.svg';
import '../css/App.css';
import Header from './Header';
import Graph from './Graph';
import {INode, ILink, State, ROOT_VIEW, IView} from "../store";
import {Map} from 'immutable';
import {Router, Route} from 'react-router';
import {History} from "history";
import {connect, Provider} from "react-redux";
import {TabTitleR} from "./TabTitle";
import ErrorPopup from "./ErrorPopup";

export interface IApp {
    title: string;
    view: IView;
    history: History<any>;
}

class App extends Component<IApp> {
  public render(): any {
      const view = this.props.view;
      const anchor = view && view.options.startNode && view.nodes.get(view.options.startNode);
      return (
          <Router history={this.props.history}>
              <div className="App">
                  <TabTitleR>Default</TabTitleR>
                  <header className="App-header">
                      <Header title={this.props.title}/>
                  </header>
                  <ErrorPopup/>
                  <Route>
                      <Graph
                          anchor={anchor}
                          view={view}
                          width={"100%"} height="calc(100% - 3rem)"
                      />
                  </Route>
              </div>
          </Router>
    );
  }
}

function mapStateToProps(state: State) {
    return {
        title: state.ui.title,
        view: state.graph.get(ROOT_VIEW),
    };
}

const ConnectedApp = connect(mapStateToProps)(App);

export default ConnectedApp;
