'use strict';
var https = require('https');
const slackBotToken = process.env.SLACK_BOT_TOKEN;

/**
 * Authorize with correct scopes
 */
exports.getSlackFile = (req, res) => {

  // Set the headers
  var headers = {
    'Authorization': `Bearer ${slackBotToken}`
  }

  var options = {
    method: 'GET',
    host: 'files.slack.com',
    port: 443,
    path: req.query.path,
    headers: headers
  };

  var request = https.request(options, function(response) { 
    var data = []; 
    console.log(response.headers);
  
    response.on('data', function(chunk) { 
      data.push(chunk); 
    }); 
  
    response.on('end', function() { 
      data = Buffer.concat(data); 
      console.log('requested content length: ', response.headers['content-length']);
      console.log('parsed content length: ', data.length);
      res.writeHead(200, {
        'Content-Type': response.headers["content-type"],
        'Content-Disposition': response.headers["content-disposition"],
        'Content-Length': data.length
      });
      res.end(data);
    });
  }); 
  
  request.end();
};