/*
 * Copyright (c) 2018 Bob Kerns.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../css/index.css';

export default function Header(props: {title: string}) {
    return (
        <h1 className='t-header'>{props.title}</h1>
    );
}
