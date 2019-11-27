module.exports = class M3u8Writer {
  constructor() {
    this.discontinuitySequence = 0;
    this.mediaSequence = 0;
    this.targetDuration = 10;
    this.slidingWindowSegmentCount = 10;
  }

  setHeaderInformation({discontinuitySequence, mediaSequence, targetDuration}) {
    discontinuitySequence && (this.discontinuitySequence = discontinuitySequence);
    mediaSequence && (this.mediaSequence = mediaSequence);
    targetDuration && (this.targetDuration = Math.ceil(targetDuration));
  }

  setSegments(segments = []) {
    this.segments = segments;

    this.targetDuration = Math.ceil(segments[0].duration);
  }

  injectSegments(segments = []) {
    const injectAt = this.mediaSequence + this.slidingWindowSegmentCount;

    const segmentsBeforeDiscontinuity = this.segments.slice(0, injectAt);
    let segmentsAfterDiscontinuity = this.segments.slice(injectAt);

    const lastSegmentBeforeDiscontinuity = this.segments[injectAt - 1];
    const manifestName = lastSegmentBeforeDiscontinuity.manifestName;

    let timeline = lastSegmentBeforeDiscontinuity.timeline + 1;
    segments.forEach((segment, s) => {
      if (s === 0) {
        segment.discontinuity = true;
      }

      segment.manifestName = manifestName;
      segment.redirectUrl = `http://localhost:8888/v1/streams/${manifestName}/segments/segment-${segmentsBeforeDiscontinuity.length + s}.ts`;
      segment.redirectDestination = segment.uri;
      segment.formattedDuration = segment.duration + (Number.isInteger(segment.duration) ? '.0' : '');
      segment.timeline = timeline;

      delete segment.uri;
    });

    ++timeline;
    segmentsAfterDiscontinuity.forEach((segment, s) => {
      if (s === 0) {
        segment.discontinuity = true;
      }

      segment.redirectUrl = `http://localhost:8888/v1/streams/${manifestName}/segments/segment-${segmentsBeforeDiscontinuity.length + segments.length + s}.ts`;
      segment.timeline = timeline;
    });

    this.segments = segmentsBeforeDiscontinuity.concat(segments, segmentsAfterDiscontinuity);
  }

  writeHeader() {
    return `
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-DISCONTINUITY-SEQUENCE:${this.discontinuitySequence}
#EXT-X-MEDIA-SEQUENCE:${this.mediaSequence}
#EXT-X-ALLOW-CACHE:NO
#EXT-X-START:TIME-OFFSET=0
#EXT-X-TARGETDURATION:${this.targetDuration}
`.trim();
  }

  write() {
    let header = this.writeHeader();

    let previousTimeline = this.discontinuitySequence;
    let bodyLines = [''];
    this.segments
      .slice(this.mediaSequence, this.mediaSequence + this.slidingWindowSegmentCount)
      .forEach((segment) => {
        if (segment.timeline > previousTimeline) {
          previousTimeline = segment.timeline;
          bodyLines.push('#EXT-X-DISCONTINUITY');
        }

        bodyLines.push(`#EXTINF:${segment.formattedDuration}`);
        bodyLines.push(segment.redirectUrl);
      });

    return header + bodyLines.join('\n');
  }
};