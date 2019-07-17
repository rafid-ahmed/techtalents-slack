'use strict';

const { WebClient } = require('@slack/web-api');
const {google} = require('googleapis');

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
 * Get an access token from the authorization code and store in BigQuery
 */
exports.oauth2callback = (req, res) => {
  // Get authorization code from request
  const code = req.query.code; 
  const state = JSON.parse(req.query.state);

  return new Promise((resolve, reject) => {
    // OAuth2: Exchange authorization code for access token
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        return reject(err);
      }
      return resolve(token);
    });
  })
  .then((token) => {
    
    // Entry key
    const key = datastore.key(['TokenTable', state.userid]);

    // DB Entry
    const entity = {
      key: key,
      data: {
        token: JSON.stringify(token),
        expirytime: token.expiry_date - 600000
      },
    };

    datastore
    .save(entity)
    .then(() => {
      console.log("token insert successfull");
      const msg = `*Authorization Successful*\n><!date^${Math.floor((token.expiry_date-600000)/1000)}^{date_pretty} at {time}|within an hour> current token will expire`;
      PostMessage(state.userid, msg, res);
      res.status(200).send();
    })
    .catch(err => {
      console.error('ERROR:', err);
      res.status(500).send();
    });
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Something went wrong; check the logs.');
  });
};

function PostMessage(userid, msg, res) {
  (async () => {
    try {
      const botchat = await web.im.open({
        user: userid
      });
      if(botchat.ok) {
        // Respond to the message back in the same channel
        const result = await web.chat.postMessage({
          text: msg,
          channel: botchat.channel.id
        });

        if(!result.ok) {
          console.log("bot couldn't send message");
          res.status(500).send();  
        }
        
      } else {
        console.log("bot couldn't open im");
      }
    } catch (error) {
      console.log(error.data);
      res.status(500).send();
    }
  })();
}