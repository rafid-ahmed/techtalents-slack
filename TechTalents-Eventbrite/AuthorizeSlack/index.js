'use strict';
const request = require('request');

const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore();

/**
 * Authorize with correct scopes
 */
exports.authorizeSlack = (req, res) => {
  if (!req.query.code) { // access denied
    console.log('Access denied');
    return;
  }
  
  request({
    url: `https://slack.com/api/oauth.access?client_id=675050136674.697250372228&client_secret=${process.env.SLACK_CLIENT_SECRET}&code=${req.query.code}&state=${req.query.state}`,
    json: true
  }, (err, response, registration) => {
    if (err) {
      callback(err);
    } else if (registration && registration.ok) {
      const key = datastore.key(['SlackTokenTable', registration.team_id]);
      // DB Entry
      const entity = {
        key: key,
        data: {
          teamid: registration.team_id,
          token: registration.bot.bot_access_token
        },
      };

      datastore
      .save(entity)
      .then(() => {
        console.log("slack token insert successfull");
        res.status(200).send("app is installed");
      })
      .catch(err => {
        console.error('ERROR:', err);
        res.status(500).send();
      });
    } else {
      console.log(registration);
      res.status(200).send("Failure");
    }
  });
};