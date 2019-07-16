// Node default crypto lib
const crypto = require('crypto');

// Lib for preventing timing Compare Attacks
const timingSafeCompare = require('tsscmp');


// Function for message signature verification
module.exports.verifySignature = function (signingSecret, requestHeaders, body) {

  const signature = requestHeaders['x-slack-signature'];
  const ts = requestHeaders['x-slack-request-timestamp'];

  // match Slack ts format
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);

  if (ts < fiveMinutesAgo) {
    console.error(new Error(
        'Timestamp older than 5 Minutes: ' + fiveMinutesAgo + " | " + ts));
    return false;
  }

  const hmac = crypto.createHmac('sha256', signingSecret);
  const [version, hash] = signature.split('=');
  hmac.update(`${version}:${ts}:${body}`);

  const verHash = hmac.digest('hex');

  // Protecting against timing attacks
  return timingSafeCompare(hash.toString(), verHash.toString());
};


// HHandling initial Authentication
module.exports.handleInitialAuth = function (req, res, slackToken) {

  if (req.body.token === slackToken) {
    res.status(200).send(req.body.challenge);
  } else {
    console.error(new Error('Initial Authentication failed.'));
    res.status(401).end();
  }

};
