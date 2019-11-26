const express = require('express');
const application = express();
const cors = require('cors');
const fs = require('fs');
const port = 8888;

application.use(express.json());
application.use(cors());


let isMockAds = false;
let manifest1 = fs.readFileSync(`./Test/testManifest.m3u8`);
let manifest2 = fs.readFileSync(`./Test/nxtManifest.m3u8`);

application.get('/v1/manifest/master/:stream.m3u8', (request, response) => {
  let m = isMockAds ? manifest2 : manifest1;
  response.set({
    'Content-Length': m.length,
    'Content-type': 'application/x-mpegURL',
  });
  response.status(200).send(m);
});
application.get('/v1/manifest/variant/:stream.m3u8', (request, response) => {
  console.log('Variant stream:', request.params.stream);
  response.status(200).send('');
});
application.get('/go', (request, response) => {
  isMockAds = !isMockAds

  response.status(200).send('');
});

application.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});