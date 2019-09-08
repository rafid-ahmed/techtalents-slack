const eventbrite = require('eventbrite').default;

const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore();

// Tokens and Secrets from the enviroment variables
const eventbriteAuthToken = process.env.EVENTBRITE_AUTH_TOKEN;

// Create configured Eventbrite SDK
const sdk = eventbrite({token: eventbriteAuthToken});

exports.eventbriteStoreEvents = (req, res) => {

    // console.log(req.body.api_url);
    var url = req.body.api_url.split("/");

    sdk.request(`/events/${url[url.length-2]}`)
    .then(event => {
        
        // insert the event token into datastore
        const key = datastore.key(['EventTable', event.id]);
        const entity = {
            key: key,
            data: {
                eventid: event.id,
                expirydate: Math.round(new Date(event.start.local.replace("T"," ")).getTime()/1000)
            },
        };

        datastore
        .save(entity)
        .then(() => {
            console.log("Eventbrite event insert successfull");
            res.status(200).send();
        })
        .catch(err => {
            console.error('ERROR:', err);
            res.status(500).send();
        });
    })
    .catch(e => {
        console.log(e);
        res.status(500).end();
    });
};