# ICS / Email Calendar Export Plan

## Goal

When any family member creates or completes a trip, the planner should generate shareable calendar files and email-ready itinerary packages.

## Outputs

1. Master trip `.ics` event covering the full trip date range.
2. Individual `.ics` events for flights, hotel check-in/out, tours, meals, spa appointments, dog-care schedule, and reminders.
3. Email-ready trip summary with attached `.ics` file.
4. Completed-trip email with itinerary, notes, album link, and optional `.ics` archive.

## v3.0 status

`js/calendar-export.js` includes a helper that can build a basic `.ics` calendar from local trip and itinerary data. It is intentionally not connected to automated email yet.

## v3.1+ implementation

- Add trip-specific route such as `/#/trip/<trip_id>`.
- Add buttons: `Download Trip Calendar`, `Download Itinerary Events`, `Email Trip Package`.
- Use backend/serverless email service for email sending.
- Track who sent/shared the trip in audit log.
