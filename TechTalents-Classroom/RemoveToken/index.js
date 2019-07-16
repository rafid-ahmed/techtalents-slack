'use strict';

const { WebClient } = require('@slack/web-api');
const {google} = require('googleapis');

const sec = require('./sec');
const fs = require('fs');

const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore();

// Configuration constants
const GCF_REGION = 'europe-west1';
const GCLOUD_PROJECT = 'tt-ekg';

// Retrieve OAuth2 config
const clientSecretJson = JSON.parse(fs.readFileSync('./client_secret.json'));

const oauth2Client = new google.auth.OAuth2(
  clientSecretJson.installed.client_id,
  clientSecretJson.installed.client_secret,
  `https://${GCF_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/oauth2callback`
);

// Slack Tokens and Secrets from the enviroment variables
const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackAuthToken = process.env.SLACK_ACCESS_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;

const web = new WebClient(slackBotToken);

/**
 * Authorize with correct scopes
 */
exports.removeToken = (req, res) => {
  // Check if url verification request
  if (req.body.type === 'url_verification') {
    sec.handleInitialAuth(req, res, slackVerificationToken);
  } 
  // Check if message containes auth token
  else if (req.body.token !== slackVerificationToken) {
    console.error(new Error('Token Authentication failed.'));
    res.status(401).send();
  }

  // Verifying message Signature
  if (!sec.verifySignature(slackSigningSecret, req.headers, req.rawBody.toString())) {
    console.error(new Error('Signature Verification failed.'));
    res.status(401).send();
  } 
  else {
    (async () => {
      res.status(200).send();
      PostEphimeralMessage(req, "Removing token, please wait ...");
      try {

        const key = datastore.key(['TokenTable', req.body.user_id]);
        datastore.delete(key, function(err) {
          if (!err) {
            const msg = `Active token deleted. Please use */authorize* command to get a new token.`;
            PostMessage(req, msg);
          } else {
            console.log(err);
          }
        });

      } catch (error) {
        console.log(error.data);
      }
    })();
  }
};

function PostMessage(req, msg) {
  (async () => {
    try {
      const botchat = await web.im.open({
        user: req.body.user_id
      });
      if(botchat.ok) {
        // Respond to the message back in the same channel
        const result = await web.chat.postMessage({
          text: msg,
          channel: botchat.channel.id
        });

        if(!result.ok) {
          console.log("bot couldn't send message");
        }
        
      } else {
        console.log("bot couldn't open im");
      }
    } catch (error) {
      console.log(error.data);
    }
  })();
}

function PostEphimeralMessage(req, msg) {
  (async () => {
    try {
      const botchat = await web.im.open({
        user: req.body.user_id
      });
      if(botchat.ok) {
        // Respond to the message back in the same channel
        const result = await web.chat.postEphemeral({
          text: msg,
          channel: botchat.channel.id,
          user: req.body.user_id
        });

        if(!result.ok) {
          console.log("bot couldn't send message");
        }
        
      } else {
        console.log("bot couldn't open im");
      }
    } catch (error) {
      console.log(error.data);
    }
  })();
}