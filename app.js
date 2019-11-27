const express = require('express');
const application = express();
const cors = require('cors');
const fs = require('fs');
const port = 8888;

application.use(express.json());
application.use(cors());

let redirect = (destination, response) => {
  response.status(302).set({
    Location: destination
  }).send();
};

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
application.get('/v1/segment/:segment.ts', (request, response) => {
  let baseUrl = 'https://f6910d75359c98ddab8aaca43071d185-httpcache0-90292-cacheod0.dna.qbrick.com/90292-cacheod0/_definst_/smil:assets/5c/5cd806f4-00090292/OfficeVideoInteract/';
  redirect(`${baseUrl}${request.params.segment}.ts`, response);
});

application.get('/go', (request, response) => {
  isMockAds = !isMockAds

  response.status(200).send('');
});

application.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});