# TechTalents-slack
Inter Disciplinary Project with Unternehmertum

## Additional information for formatting event messages
### Event (object)
+ id: 12345 (string) - Event ID
+ name (multipart-text) - Event name
+ description (multipart-text, optional) - Event description (contents of the event page). May be long and have significant formatting. Clients may choose to skip retrieving the event description by enabling the API switch OMIT_DESCRIPTION_FROM_EVENT_CONTAINER, which will result in the description being returned as null.
+ start (datetime-tz) - Start date/time of the event
+ end (datetime-tz) - End date/time of the event
+ url: https://www.eventbrite.com/e/45263283700 (string) - The URL to the event page for this event on Eventbrite
+ vanity_url: https://testevent.eventbrite.com (string, optional) - The vanity URL to the event page for this event on Eventbrite
+ created: `2017-02-19T20:28:14Z` (datetime, required) - When the event was created
+ changed: `2017-02-19T20:28:14Z` (datetime, required) - When the event was last changed
+ published: `2017-02-19T20:28:14Z` (datetime, optional, nullable) - When the event was first published
+ status: live (enum[string], optional) - Status of the event
    + Members
        + draft - A preliminary form of a possible future Event.
        + live - The Event can accept registrations or purchases if ticket classes are available.
        + started - The Event start date has passed.
        + ended - The Event end date has passed.
        + completed - The funds for your Event have been paid out.
        + canceled - The Event has been canceled.
+ currency: USD (string) - The ISO 4217 currency code for this event
+ online_event: false (boolean) - If this event doesn’t have a venue and is only held online
+ organization_id (string) - Organization owning the event
+ organizer_id (string) - ID of the event organizer
+ organizer (Organizer, optional) - Full details of the event organizer (requires the `organizer` expansion)
+ logo_id (string, nullable) - Image ID of the event logo
+ logo (image-logo, optional, nullable) - Full image details for event logo (requires the `logo` expansion)
+ venue_id (string, optional) - Event venue ID
+ venue (Venue, optional) - Full venue details for `venue_id` (requires the `venue` expansion)
+ format_id (string, nullable) - Event format (Expansion: `format`)
+ format (Format, optional) - Full details of the event format (requires the `format` expansion)
+ category_id (string, optional, nullable) - Event category (Expansion: `category`)
+ category (Category, optional) - Full details of the event category (requires the `category` expansion)
+ subcategory_id (string, optional, nullable) - Event subcategory (Expansion: `subcategory`)
+ subcategory (Subcategory, optional) - Full details of the event subcategory (requires the `subcategory` expansion)
+ music_properties (Music Properties, optional) - This is an object of properties that detail dimensions of music events.
+ `bookmark_info` (Bookmark Info, optional) - The bookmark information on the event, requires the `bookmark_info` expansion
+ refund_policy (string, optional) - (Expansion)
+ ticket_availability (Ticket Availability, optional) - Additional data about general tickets information (optional).
+ listed: false (boolean) - Is this event publicly searchable on Eventbrite?
+ shareable: false (boolean) - Can this event show social sharing buttons?
+ invite_only: false (boolean) - Can only people with invites see the event page?
+ show_remaining: true (boolean) - Should the event page show the number of tickets left?
+ password: 12345 (string) - Event password
+ capacity: 100 (number) - Maximum number of people who can attend.
+ capacity_is_custom: true (boolean) - If True, the value of capacity is a custom-set value; if False, it's a calculated value of the total of all ticket capacities.
+ tx_time_limit: 12345 (string) - Maximum duration (in seconds) of a transaction
+ hide_start_date: true (boolean) - Shows when event starts
+ hide_end_date: true (boolean) - Hide when event starts
+ locale: en_US (string) - The event Locale
+ is_locked: true (boolean)
+ privacy_setting: unlocked (string)
+ is_externally_ticketed: false (boolean) - true, if the Event is externally ticketed
+ external_ticketing (External Ticketing, optional) — Returns the external ticketing information associated to this Event.
+ is_series: true (boolean) - If the event is a series
+ is_series_parent: true (boolean)
+ is_reserved_seating: true (boolean) - If the events has been set to have reserved seatings
+ show_pick_a_seat: true (boolean) - Enables to show pick a seat option
+ show_seatmap_thumbnail: true (boolean) - Enables to show seat map thumbnail
+ show_colors_in_seatmap_thumbnail: true (boolean) - For reserved seating event, if venue map thumbnail should have colors on the event page.
+ is_free: true (boolean) - Allows to set a free event
+ source: api (string) - Source of the event (defaults to API)
+ version: null (string)
+ resource_uri: https://www.eventbriteapi.com/v3/events/1234/ (string) - Is an absolute URL to the API endpoint that will return you the canonical representation of the event.
+ event_sales_status (Event Sales Status, optional) - Additional data about the sales status of the event (optional).
+ checkout_settings (Checkout Settings, optional) - Additional data about the checkout settings of the Event.

### Example JSON Response

```json
{
    "name": {
        "text": "Tech Event X", 
        "html": "Tech Event X"
    }, 
    "description": {
        "text": "Some dummy event description writing here....", 
        "html": "<P>Some dummy event description writing here....<\/P>"
    }, 
    "id": "71538957949", 
    "url": "https://www.eventbrite.com/e/tech-event-x-tickets-71538957949", 
    "start": {
        "timezone": "Europe/Berlin", 
        "local": "2019-10-18T19:00:00", 
        "utc": "2019-10-18T17:00:00Z"
    }, 
    "end": {
        "timezone": "Europe/Berlin", 
        "local": "2019-10-18T22:00:00", 
        "utc": "2019-10-18T20:00:00Z"
    }, 
    "organization_id": "259102778669", 
    "created": "2019-09-04T17:11:02Z", 
    "changed": "2019-09-04T17:11:05Z", 
    "published": "2019-09-04T17:11:05Z", 
    "capacity": 120, 
    "capacity_is_custom": false, 
    "status": "live", 
    "currency": "EUR", 
    "listed": false, 
    "shareable": false, 
    "invite_only": true, 
    "online_event": false, 
    "show_remaining": true, 
    "tx_time_limit": 480, 
    "hide_start_date": false, 
    "hide_end_date": false, 
    "locale": "en_US", 
    "is_locked": false, 
    "privacy_setting": "unlocked", 
    "is_series": false, 
    "is_series_parent": false, 
    "inventory_type": "limited", 
    "is_reserved_seating": false, 
    "show_pick_a_seat": false, 
    "show_seatmap_thumbnail": false, 
    "show_colors_in_seatmap_thumbnail": false, 
    "source": "create_2.0", 
    "is_free": false, 
    "version": "3.0.0", 
    "summary": "Some dummy event description writing here....", 
    "logo_id": "71031729", 
    "organizer_id": "24996277640", 
    "venue_id": "37598207", 
    "category_id": null, 
    "subcategory_id": null, 
    "format_id": null, 
    "resource_uri": "https://www.eventbriteapi.com/v3/events/71538957949/", 
    "is_externally_ticketed": false, 
    "logo": {
        "crop_mask": {
            "top_left": {
                "x": 0, 
                "y": 323
            }, 
            "width": 1306, 
            "height": 653
        }, 
        "original": {
            "url": "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F71031729%2F259102778669%2F1%2Foriginal.20190904-170609?auto=compress&s=aa6cc81b5beb41fec6ef8192fe594906", 
            "width": 1306, 
            "height": 1306
        }, 
        "id": "71031729", 
        "url": "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F71031729%2F259102778669%2F1%2Foriginal.20190904-170609?h=200&w=450&auto=compress&rect=0%2C323%2C1306%2C653&s=24298e94db36f550d8f4d530ad902731", 
        "aspect_ratio": "2", 
        "edge_color": "#ffffff", 
        "edge_color_set": true
    }
}
```
