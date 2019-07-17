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
 * Create new assignment for students in google classroom
 */
exports.queryClassroom = (req, res) => {

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
    PostEphimeralMessage(req, "Fetching results, please wait ...");
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
                switch(req.body.command) {
                  case '/listcourses':
                    ListCourses(req);
                    break;
                  case '/listcourseworks':
                    ListCourseworks(req);
                    break;
                  case '/listdueworks':
                    ListDueworks(req);
                    break;
                  default:
                }
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

function ListCourses(req) {
  if(req.body.text == 'teacher') {
    classroom.courses.list({
      auth: oauth2Client,
      teacherId: 'me'
    }, (err, result) => {
      ListCoursesHelper(err, result, req);
    });
  } else if (req.body.text == 'student') {
    // PostMessage(req, "Fetching results please wait ...");
    classroom.courses.list({
      auth: oauth2Client,
      studentId: 'me'
    }, (err, result) => {
      ListCoursesHelper(err, result, req);
    });
  } else {
      PostMessage(req, 'Please choose */listcourses [teacher]* OR */listcourses [student]*');
  }
}

function ListCoursesHelper(err, result, req) {
  if (err) {
    console.error('The classroom.courses.list API returned an error: ' + err);
    if (req.body.text == 'teacher') {
      PostMessage(req, 'Hey, you are not a *teacher* of this course :face_with_monocle:');
    }else if (req.body.text == 'student') {
      PostMessage(req, 'Hey, you are not a *student* of this course :face_with_monocle:');
    }
  } else {
    const courses = result.data.courses;
    if (courses && courses.length) {
      var msg = 'Courses you are a member of :';
      courses.forEach((course) => {
        msg += `\n>*${course.name}*`;
      });
      PostMessage(req, msg);
    } else {
      PostMessage(req, `No course(s) could be found!`);
    }
  }
}

function ListCourseworks(req) {
  if(req.body.text.indexOf('teacher') > -1) {
    GetTeacherCourseList(req);
  } else if(req.body.text.indexOf('student') > -1) {
    GetStudentCourseList(req);
  } else {
      PostMessage(req, 'Please choose */listcourseworks [teacher] [course name]* OR */listcourseworks [student] [course name]*');
  }
}

function ListDueworks(req) {
  if(req.body.text.length > 0) {
    GetStudentCourseList(req);
  } else {
      PostMessage(req, 'Please choose */listdueworks [course name]*');
  }
}

function GetTeacherCourseList(req) {
  classroom.courses.list({
    auth: oauth2Client,
    teacherId: 'me'
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.list API returned an error: ' + err);
    } else {
      const courses = result.data.courses;
      if (courses && courses.length) {
        var found = false;
        courses.forEach((course) => {
          if(req.body.text.indexOf(course.name) > -1) {
            // PostMessage(req, "Fetching results please wait ...");
            found = true;
            GetTeacherCourseworks(req, course);
          }
        });
        if(!found) {
          PostMessage(req, 'Unknown or no course name given');
        }
      } else {
        PostMessage(req, `No course(s) could be found!`);
      }
    }
  });
}

function GetTeacherCourseworks(req, course) {
  classroom.courses.courseWork.list({
    auth: oauth2Client,
    courseId: course.id
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.list API returned an error: ' + err);
      PostMessage(req, 'Hey, you are not a *teacher* of this course :face_with_monocle:');
    } else {
      const courseWorks = result.data.courseWork;
      if (courseWorks && courseWorks.length) {
        var msg = `*${course.name} courseworks :*`;
        courseWorks.forEach((courseWork) => {
          // var unixTimestamp = Math.round(new Date(`${courseWork.dueDate.year}-${courseWork.dueDate.month}-${courseWork.dueDate.day} 
          //${courseWork.dueTime.hours}:${courseWork.dueTime.minutes}`).getTime());
          // msg += `\n>*${courseWork.title}* due <!date^${Math.floor(unixTimestamp/1000)}^{date_pretty} at {time}|Check Classroom>`;
          msg += `\n>${courseWork.title}`;
        });
        PostMessage(req, msg);
      } else {
        var msg = `*${course.name} courseworks :*`;
        msg += `\n>No coursework found !`;
        PostMessage(req, msg);
      }
    }
  });
}

function GetStudentCourseList(req) {
  classroom.courses.list({
    auth: oauth2Client,
    studentId: 'me'
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.list API returned an error: ' + err);
      PostMessage(req, 'Hey, you are not a *student* of this course :face_with_monocle:');
    } else {
      const courses = result.data.courses;
      if (courses && courses.length) {
        var found = false;
        courses.forEach((course) => {
          if(req.body.text.indexOf(course.name) > -1) {
            found = true;
            if(req.body.command == '/listdueworks') {
              GetStudentDueCourseworks(req, course);
            } else {
              GetStudentCourseworks(req, course);
            }
          }
        });
        if(!found) {
          PostMessage(req, 'Unknown or no course name given');
        }
      } else {
        PostMessage(req, `No course(s) could be found!`);
      }
    }
  });
}

function GetStudentCourseworks(req, course) {
  classroom.courses.courseWork.list({
    auth: oauth2Client,
    courseId: course.id
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.list API returned an error: ' + err);
      PostMessage(req, 'Hey, you are not a *student* of this course :face_with_monocle:');
    } else {
      var msg = `*${course.name} courseworks :*`;
      var workcount = 0;
      // PostMessage(req, msg);
      const courseWorks = result.data.courseWork;
      if (courseWorks && courseWorks.length) {
        courseWorks.forEach((courseWork) => {
          // GetSubmissions(req, msg, course, courseWork, workcount, courseWorks.length);
          var unixTimestamp = Math.round(new Date(`${courseWork.dueDate.year}-${courseWork.dueDate.month}-${courseWork.dueDate.day} ${courseWork.dueTime.hours}:${courseWork.dueTime.minutes}`).getTime());
          classroom.courses.courseWork.studentSubmissions.list({
            auth: oauth2Client,
            courseId: course.id,
            courseWorkId: courseWork.id
          }, (err, result) => {
            if (err) {
              console.error('The classroom.courses.courseWork.studentSubmissions.list API returned an error: ' + err);
              PostMessage(req, 'Hey, you are not a *student* of this course :face_with_monocle:');
            } else {
              const studentSubmissions = result.data.studentSubmissions;
              if (studentSubmissions && studentSubmissions.length) {
                studentSubmissions.forEach((studentSubmission) => {
                  switch (studentSubmission.state) {
                    case "CREATED":
                      if(unixTimestamp > Date.now()) {
                        msg += `\n>*${courseWork.title}* has not been submitted. <!date^${Math.floor(unixTimestamp/1000)}^{date_pretty} at {time} deadline will end|Check Classroom>`;
                      } else {
                        msg += `\n>Failed to submit *${courseWork.title}* within deadline. <!date^${Math.floor(unixTimestamp/1000)}^{date_pretty} at {time} deadline ended|Check Classroom>`;
                      }
                      break;
                    case "TURNED_IN":
                      msg += `\n>*${courseWork.title}* has been submitted. Not graded yet.`;
                      break;
                    case "RETURNED":
                      if(studentSubmission.assignedGrade) {
                        msg += `\n>*${courseWork.title}* has been graded. You got: ${studentSubmission.assignedGrade}.`;
                      } else {
                        msg += `\n>*${courseWork.title}* has been graded.`;
                      }
                      break;
                    case "RECLAIMED_BY_STUDENT":
                      if(unixTimestamp > Date.now()) {
                        msg += `\n>*${courseWork.title}* has been reclaimed. <!date^${Math.floor(unixTimestamp/1000)}^{date_pretty} at {time} deadline will end|Check Classroom>`;
                      } else {
                        msg += `\n>Reclaimed and failed to re-submit *${courseWork.title}* within deadline. <!date^${Math.floor(unixTimestamp/1000)}^{date_pretty} at {time} deadline ended|Check Classroom>`;
                      }
                      break;
                    default:
                      msg += `\n>*${courseWork.title}* -> ${studentSubmission.state}`;
                      break;
                  }
                  workcount++;
                  if (workcount >= courseWorks.length) {
                    PostMessage(req, msg);
                  }
                });
              }
            }
          });
        });
      }
      else {
        PostMessage(req, `>No coursework could be found for this course`);
      }
    }
  });
}

function GetStudentDueCourseworks(req, course) {
  classroom.courses.courseWork.list({
    auth: oauth2Client,
    courseId: course.id
  }, (err, result) => {
    if (err) {
      console.error('The classroom.courses.courseWork.list API returned an error: ' + err);
      PostMessage(req, 'Hey, you are not a *student* of this course :face_with_monocle:');
    } else {
      // PostMessage(req, msg);
      const courseWorks = result.data.courseWork;
      if (courseWorks && courseWorks.length) {
        courseWorks.forEach((courseWork) => {
          // GetSubmissions(req, msg, course, courseWork, workcount, courseWorks.length);
          classroom.courses.courseWork.studentSubmissions.list({
            auth: oauth2Client,
            courseId: course.id,
            courseWorkId: courseWork.id
          }, (err, result) => {
            if (err) {
              console.error('The classroom.courses.courseWork.studentSubmissions.list API returned an error: ' + err);
              PostMessage(req, 'Hey, you are not a *student* of this course :face_with_monocle:');
            } else {
              const studentSubmissions = result.data.studentSubmissions;
              if (studentSubmissions && studentSubmissions.length) {
                studentSubmissions.forEach((studentSubmission) => {
                  switch (studentSubmission.state) {
                    case "RECLAIMED_BY_STUDENT":
                    case "CREATED":
                      const msg = `>*${courseWork.title}* has not been submitted. Submit it under ${course.name} course.`;
                      PostMessage(req, msg);
                      break;
                    default:
                      break;
                  }
                });
              }
            }
          });
        });
      }
      else {
        PostMessage(req, `>No coursework could be found for this course`);
      }
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