'use strict';

// Stands in for decode-uri-component 0.2.x (used by expo-router through query-string), whose
// fallback for malformed input can take exponential time. Same behaviour, linear time: anything
// that doesn't decode is left as it was.

const RUN = /(?:%[a-f0-9]{2})+/gi;

/** How many bytes a UTF-8 sequence starting with `lead` has, or 0 if it can't start one. */
function sequenceLength(lead) {
  if (lead < 0x80) return 1;
  if (lead >= 0xc2 && lead <= 0xdf) return 2;
  if (lead >= 0xe0 && lead <= 0xef) return 3;
  if (lead >= 0xf0 && lead <= 0xf4) return 4;
  return 0;
}

function decodeRun(run) {
  try {
    return decodeURIComponent(run);
  } catch {
    // Decode one UTF-8 sequence at a time; whatever isn't valid stays as it was.
    const parts = run.match(/%[a-f0-9]{2}/gi);
    const bytes = parts.map((p) => parseInt(p.slice(1), 16));
    let out = '';
    let i = 0;
    while (i < parts.length) {
      const len = sequenceLength(bytes[i]);
      let ok = len > 0 && i + len <= parts.length;
      for (let k = 1; ok && k < len; k++) ok = bytes[i + k] >= 0x80 && bytes[i + k] <= 0xbf;
      if (ok) {
        try {
          out += decodeURIComponent(parts.slice(i, i + len).join(''));
          i += len;
          continue;
        } catch {
          // overlong or surrogate: falls through and stays as it was
        }
      }
      out += parts[i];
      i += 1;
    }
    return out;
  }
}

module.exports = function decodeUriComponent(encodedURI) {
  if (typeof encodedURI !== 'string') {
    throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
  }
  try {
    return decodeURIComponent(encodedURI);
  } catch {
    // The original also turns a stray byte-order mark into the real character.
    return encodedURI.replace(/%FE%FF|%FF%FE/gi, '��').replace(RUN, decodeRun);
  }
};
