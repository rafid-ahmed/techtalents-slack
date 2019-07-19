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
 * Submit students assignment in corresponding google classroom coursework
 */
exports.uploadCoursework = (req, res) => {

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
      if (req.body.event.thread_ts) {
        console.log(req.body.event.files);
        PostEphimeralMessage(req, "Submitting assignment, please wait ...");
        try {

          const key = datastore.key(['TokenTable', req.body.event.user]);
          datastore.get(key, function(err, entity) {
            if(err) {
              console.log(err);
            } else {
              if(entity) {
                if(entity.expirytime > Date.now() + 60000) {
                  const token = JSON.parse(entity.token);
                  oauth2Client.credentials = token;
                  console.log(req.body.event);

                  web.im.replies({
                    channel: req.body.event.channel,
                    ts: req.body.event.thread_ts
                  }).then(result => {
                    console.log(result);
                    if (result.ok === true) {
                      const text = result.messages[0].text;
                      const filename = req.body.event.files[0].name;
                      const fileurl = "https://us-central1-tt-ekg.cloudfunctions.net/getSlackFile?path=" + req.body.event.files[0].url_private_download.substr("https://files.slack.com".length);
                      GetCourseList(req, text, filename, fileurl);
                    } else {
                      PostMessage(req, `Parent text could not be found! :confused:`);
                      console.log("Parent text could not found: *" + req.body.event.thread_ts);
                    }
                  }).catch(e => {
                    console.log("error occuring for im reply " + e);
                  });
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
      }
    })();
  }
};

function GetCourseList(req, text, filename, fileurl) {
  classroom.courses.list({
    auth: oauth2Client,
    studentId: 'me'
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.list API returned an error: ' + err);
      PostMessage(req, 'Unable to get list of courses :face_with_monocle:');
    } else {
      const courses = result.data.courses;
      if (courses && courses.length) {
        courses.forEach((course) => {
          if(text.indexOf(course.name) > -1) {
            GetCourseworks(req, text, course, filename, fileurl);
          }
        });
      } else {
        PostMessage(req, `No course(s) could be found! :confused:`);
      }
    }
  });
}

function GetCourseworks(req, text, course, filename, fileurl) {
  classroom.courses.courseWork.list({
    auth: oauth2Client,
    courseId: course.id
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.list API returned an error: ' + err);
      PostMessage(req, 'Unable to get list of courseworks :face_with_monocle:');
    } else {
      const courseWorks = result.data.courseWork;
      if (courseWorks && courseWorks.length) {
        courseWorks.forEach((courseWork) => {
          if (text.indexOf(courseWork.title) > -1) {
            // if (unixTimestamp > current && courseWork.workType == 'ASSIGNMENT') {
            if (courseWork.workType == 'ASSIGNMENT') {
              classroom.courses.courseWork.studentSubmissions.list({
                auth: oauth2Client,
                courseId: course.id,
                courseWorkId: courseWork.id
              }, (err, result) => {
                if (err) {
                  console.error('The classroom.courses.courseWork.studentSubmissions.list API returned an error: ' + err);
                  PostMessage(req, 'Unable to fetch assignment :face_with_monocle:');
                } else {
                  const studentSubmissions = result.data.studentSubmissions;
                  if (studentSubmissions && studentSubmissions.length) {
                    studentSubmissions.forEach((studentSubmission) => {
                      switch(studentSubmission.state) {
                        case 'RECLAIMED_BY_STUDENT':
                        case 'CREATED':
                          AttachAssignment(req, course, courseWork, studentSubmission, filename, fileurl);
                          return;
                        case 'TURNED_IN':
                          PostMessage(req, 'The assignment was already turned in :thinking_face:');
                          return;
                        case 'RETURNED':
                          PostMessage(req, 'The assignment has already been graded !');
                          return;
                        default:
                      }
                    });
                  }
                }
              });

            } else {
              if (courseWork.workType == 'ASSIGNMENT') {
                // PostMessage(req, `bad luck... deadline already ended on <!date^${Math.floor(unixTimestamp/1000)}^{date_pretty} at {time}|Check Classroom> :grimacing:`);
              } else {
                PostMessage(req, `Sorry, the submission must be for *Assignment* type coursework`);
              }
            }
          }else {
          }
        });
      }
    }
  });
}

function AttachAssignment(req, course, courseWork, studentSubmission, filename, fileurl) {
  classroom.courses.courseWork.studentSubmissions.modifyAttachments({
    auth: oauth2Client,
    courseId: course.id,
    courseWorkId: courseWork.id,
    id: studentSubmission.id,
    requestBody: {
      addAttachments: 
      [
        {
          link: {
            url: fileurl
          }
        }
      ]
    }
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.studentSubmissions.modifyAttachments API returned an error: ' + err);
      PostMessage(req, 'Unable to fetch assignment :face_with_monocle:');
    } else {
      TurnIn(req, course, courseWork, studentSubmission, filename);
    }
  });
}

function TurnIn(req, course, courseWork, studentSubmission, filename) {
  classroom.courses.courseWork.studentSubmissions.turnIn({
    auth: oauth2Client,
    courseId: course.id,
    courseWorkId: courseWork.id,
    id: studentSubmission.id,
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.studentSubmissions.list API returned an error: ' + err);
      PostMessage(req, 'Unable to fetch assignment :face_with_monocle:');
    } else {
      var unixTimestamp = Math.round(new Date(`${courseWork.dueDate.year}-${courseWork.dueDate.month}-${courseWork.dueDate.day} ${courseWork.dueTime.hours}:${courseWork.dueTime.minutes}`).getTime());
      var current = Date.now();
      if (unixTimestamp > current) {
        PostMessage(req, `*${filename}* has been *submitted* to *${course.name}* within deadline ! Good Job ! :thumbsup:`);
      } else {
        PostMessage(req, `*${filename}* has been *submitted* to *${course.name}* after deadline !`);
      }
    }
  });
}

function PostMessage(req, msg) {
  (async () => {
    try {
      const botchat = await web.im.open({
        user: req.body.event.user
      });
      if(botchat.ok) {
        // Respond to the message back in the same channel
        const result = await web.chat.postMessage({
          text: msg,
          channel: botchat.channel.id
        });

        if(!result.ok) {
          console.log("bot couldn't send message");
          // res.status(500).end();
        }

      } else {
        console.log("bot couldn't open im");
        // res.status(500).end();
      }
    } catch (error) {
      console.log(error.data);
      // res.status(500).end();
    }
  })();
}

function PostEphimeralMessage(req, msg) {
  (async () => {
    try {
      const botchat = await web.im.open({
        user: req.body.event.user
      });
      if(botchat.ok) {
        // Respond to the message back in the same channel
        const result = await web.chat.postEphemeral({
          text: msg,
          channel: botchat.channel.id,
          user: req.body.event.user
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