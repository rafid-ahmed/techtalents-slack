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
  clientSecretJson.web.client_id,
  clientSecretJson.web.client_secret,
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
exports.authorize = (req, res) => {
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
      PostEphimeralMessage(req, "Authorizing, please wait ...");
      try{ 
        const key = datastore.key(['TokenTable', req.body.user_id]);
        datastore.get(key, function(err, entity) {
          if(err) {
            console.log(err);
          } else {
            if(entity) {
              if(entity.expirytime > Date.now() + 60000) {
                const msg = `You can use other commands now\n><!date^${Math.floor(entity.expirytime/1000)}^{date_pretty} at {time}|within an hour> current token will expire`;
                PostMessage(req, msg);
              } else {
                datastore.delete(key, function(err) {
                  if (!err) {
                    SendLink(req);
                  } else {
                    console.log(err);
                  }
                });
              }
            } else {
              SendLink(req);
            }
          }
        });
      } catch (error) {
        console.log(error.data);
      }
    })();
  }
};

function SendLink(req) {
  const scopes = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me',
    'https://www.googleapis.com/auth/classroom.coursework.students'
  ];
  // Generate + redirect to OAuth2 consent form URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: JSON.stringify({ userid: req.body.user_id }),
  });

  const msg = `<${authUrl}|Request an *authorization token* by clicking here>\n>Please choose your *@edu.unternehmertum.de* account`;
  PostMessage(req, msg);
}

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