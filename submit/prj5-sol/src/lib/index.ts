import React from 'react';
import * as ReactDom from 'react-dom/client';

import App from "../components/app.js";


const app = React.createElement(App);
ReactDom.createRoot(document.querySelector('#app')!).render(app);



