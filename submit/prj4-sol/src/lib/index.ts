import makeApp from './app.js';

const WS_URL = 'https://zdu.binghamton.edu:2345';

//cannot use top-level await since parcel does not seem to handle
//<script type="module">
(async function() {
  await makeApp(WS_URL);
})();
