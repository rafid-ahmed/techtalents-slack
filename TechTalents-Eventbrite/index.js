const { WebClient } = require('@slack/web-api');
const eventbrite = require('eventbrite').default;


// Tokens and Secrets from the enviroment variables
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const eventbriteAuthToken = process.env.EVENTBRITE_AUTH_TOKEN;

// Create configured Eventbrite SDK
const sdk = eventbrite({token: eventbriteAuthToken});

const web = new WebClient(slackBotToken);

exports.eventbriteEvents = (req, res) => {
    
    console.log(req.body.api_url);
    var url = req.body.api_url.split("/");
    var message;

    sdk.request(`/events/${url[url.length-2]}`)
    .then(event => {

        message = `Hi everyone! You are welcome to join *${event.name.text}* ! :smile:`;

        sdk.request(`/venues/${event.venue_id}`)
        .then(venue => {
            
            message += `\n\n>*Venue:*\n>${venue.address.localized_address_display}`;
            if(venue.address.country == "DE") {
                message += `, Germany`;
            }

            var start_timestamp = Math.round(new Date(event.start.local.replace("T"," ")).getTime()/1000);
            var end_timestamp = Math.round(new Date(event.end.local.replace("T"," ")).getTime()/1000);

            message += `\n\n>*Event start time:*\n><!date^${start_timestamp}^{date_pretty} at {time}|check link below>`;
            message += `\n\n>*Event end time:*\n><!date^${end_timestamp}^{date_pretty} at {time}|check link below>`;
            if (event.capacity <= 100) {
                message += `\n\nOnly *${event.capacity}* tickets available! Get yours here: <${event.url}>`;
            } else {
                message += `\n\nGet your tickets here: <${event.url}>`;
            }

            web.channels.list()
            .then(result => {
                if (result.ok == true) {
                    result.channels.forEach((channel) => {
                        if(channel.is_member) {
                            (async () => {
                                try {
                                    // Respond to the message back in the same channel
                                    const rslt = await web.chat.postMessage({
                                        text: message,
                                        channel: channel.id
                                    });
                                } 
                                catch (error) {
                                    console.log(error.data);
                                    res.status(500).end();
                                }
                            })();
                            console.log(channel.id);
                        }
                    });
    
                    res.status(200).end();
            
                } else {
                    console.log("slack channels not found!");
                    res.status(400).end();
                }
            });

            /*
                sdk.request(`/events/${event.venue_id}/ticket_classes`)
                .then(tickets => {

                    tickets.ticket_classes.forEach((ticket) => {

                    });

                });
            */;
         
        });

    })
    .catch(e => {
        console.log(e);
        res.status(500).end();
    });
};