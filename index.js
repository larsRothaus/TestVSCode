const express = require('express');
const application = express();
const cors = require('cors');
const fs = require('fs');
const M3u8Parser = require('m3u8-parser');
const M3u8Writer = require('./M3u8Writer');
const port = 8888;
const manifests = {};
const manifestWriters = {};
const segmentMapping = {};

const redirect = (destination, response) => {
  response.status(302).set({
    Location: destination
  }).send();
};

application.use(express.json());
application.use(cors());

application.get('/v1/streams/:stream/manifests/manifest.m3u8', (request, response) => {
  let manifestName = request.params.stream;
  if (!fs.existsSync(`./manifests/${manifestName}.m3u8`)) {
    return response.status(404).send();
  }

  if (!(manifestName in manifestWriters)) {
    manifestWriters[manifestName] = new M3u8Writer();
  }
  let manifestWriter = manifestWriters[manifestName];

  let manifestText = fs.readFileSync(`./manifests/${manifestName}.m3u8`);
  let manifestParser = new M3u8Parser.Parser();
  manifestParser.push(manifestText);
  manifestParser.end();

  if (!manifestWriter.segments || !manifestWriter.segments.length) {
    let segments = manifestParser.manifest.segments.map((segment, s) => {
      segment.manifestName = manifestName;
      segment.redirectUrl = `http://localhost:8888/v1/streams/${manifestName}/segments/segment-${s}.ts`;
      segment.redirectDestination = segment.uri;
      segment.formattedDuration = segment.duration + (Number.isInteger(segment.duration) ? '.0' : '');
      delete segment.uri;

      return segment;
    });

    manifestWriter.setSegments(segments);
  }

  let manifest = manifestWriter.write();

  response.set({
    'Content-Length': manifest.length,
    'Content-type': 'application/x-mpegURL',
  });

  response.status(200).send(manifest);
});

application.get('/v1/streams/:stream/segments/segment-:segment.ts', (request, response) => {
  const manifestName = request.params.stream;
  const segmentNumber = request.params.segment;
  const manifestWriter = manifestWriters[manifestName];
  const segment = manifestWriter.segments[segmentNumber];

  ++manifestWriter.mediaSequence;
  if (segment.discontinuity) {
    ++manifestWriter.discontinuitySequence;
  }

  let isAllowedToGetSegment = true; // ToDo: Build logic to see if user is allowed to get this segment
  if (isAllowedToGetSegment) {
    if (segment.proxy) {
      // ToDo: Serve ad segment directly
    }
    else if (segment.redirectDestination) {
      return redirect(segment.redirectDestination, response);
    }
    else {
      return response.status(404).send();
    }
  }
  else { // ToDo: Handle better
    return response.status(403).send();
  }
});

application.get('/v1/streams/:stream/segments', (request, response) => {
  const manifestName = request.params.stream;
  const manifestWriter = manifestWriters[manifestName];
  response.status(200).send(manifestWriter.segments);
});

application.get('/v1/streams/:stream/ads/inject', (request, response) => {
  const manifestName = request.params.stream;
  const manifestWriter = manifestWriters[manifestName];
  const adSegments = [
    {
      duration: 10,
      uri: 'https://f6910d75359c98ddab8aaca43071d185-httpcache0-90292-cacheod0.dna.qbrick.com/90292-cacheod0/_definst_/smil:assets/5c/5cd806f4-00090292/OfficeVideoInteract/media_b3628000_1.ts'
    }
  ];
  manifestWriter.injectSegments(adSegments);
  response.status(202).send();
});

application.get('/go', (request, response) => {
  isMockAds = !isMockAds;

  response.status(200).send('');
});

application.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});