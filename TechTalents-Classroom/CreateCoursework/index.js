'use strict';

const { WebClient } = require('@slack/web-api');
const {google} = require('googleapis');
const classroom = google.classroom('v1');

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
 * Create new assignment for students in google classroom
 */
exports.createCoursework = (req, res) => {

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
    res.status(200).send();
    PostEphimeralMessage(req, "Creating assignment, please wait ...");
    (async () => {
      try {
        const key = datastore.key(['TokenTable', req.body.user_id]);
        datastore.get(key, function(err, entity) {
          if(err) {
            console.log(err);
          } else {
            if(entity) {
              if(entity.expirytime > Date.now() + 60000) {
                const token = JSON.parse(entity.token);
                oauth2Client.credentials = token;
                CreateAssignment(req);
              } else {
                PostMessage(req, 'Please make authorization to google classroom using */authorize* command');
              }
            } else {
              PostMessage(req, 'Please make authorization to google classroom using */authorize* command');
            }
          }
        });
      } catch (error) {
        console.log(error.data);
      }
    })();
  }
};

function CreateAssignment(req) {
  var text = req.body.text.split(":");
  classroom.courses.list({
    auth: oauth2Client,
    teacherId: 'me'
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.list API returned an error: ' + err);
      PostMessage(req, 'Hey, you are not a *teacher* of this course :face_with_monocle:');
    } else {
      const courses = result.data.courses;
      if (courses && courses.length) {
        var course_found = false;
        courses.forEach((course) => {
          if(course.name == text[0]) {
            course_found = true;
            CreateCoursework(req, text, course);
          }
        });
        if (!course_found) {
          const msg = `No course name ${text[0]} could be found!`;
          PostMessage(req, msg);
        }
      } else {
        const msg = `No course(s) could be found!`;
        PostMessage(req, msg);
      }
    }
  });
}

function CreateCoursework(req, text, course) {
  classroom.courses.courseWork.create({
    auth: oauth2Client,
    courseId: course.id,
    requestBody: {
      title: text[1],
      workType: 'ASSIGNMENT'
    }
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.create API returned an error: ' + err);
      PostMessage(req, 'Hey, you are not a *teacher* of this course :face_with_monocle:');
    } else {
      const msg = `Coursework *${result.data.title}* was created under course *${course.name}*`;
      PostMessage(req, msg);
    }
  });
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

        if(!result.ok)  {
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