const eventbrite = require('eventbrite').default;

const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore();

// Tokens and Secrets from the enviroment variables
const eventbriteAuthToken = process.env.EVENTBRITE_AUTH_TOKEN;

// Create configured Eventbrite SDK
const sdk = eventbrite({token: eventbriteAuthToken});

exports.eventbriteDeleteEvents = (req, res) => {

    // console.log(req.body.api_url);
    var url = req.body.api_url.split("/");

    sdk.request(`/events/${url[url.length-2]}`)
    .then(event => {
      const key = datastore.key(['EventTable', event.id]);
      datastore.delete(key, function(err) {
          if (err) {
            console.log(err);
          }
          res.status(200).send();
      });
    })
    .catch(e => {
        console.log(e);
        res.status(500).end();
    });
};