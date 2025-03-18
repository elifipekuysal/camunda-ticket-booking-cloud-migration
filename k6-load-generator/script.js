import http from 'k6/http';
import { check } from 'k6';

export const options = {
  // A number specifying the number of VUs to run concurrently.
  vus: 500,
  // A string specifying the total duration of the test run.
  duration: '1m',
};

// Use the following options to ramp the number of VUs up and down during the test
export const optionsForRampingVus = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 10 },
    { duration: '20s', target: 0 },
  ],
};

export default function() {
  let response = http.put('http://ticket-booking-alb-670218667.eu-central-1.elb.amazonaws.com/ticket?simulateBookingFailure=none');

  check(response, {
      'is status 200': (r) => r.status === 200,
      'response time is less than 200ms': (r) => r.timings.duration < 200,
  });
}

/*
 Run k6 with the following command:
k6 run script.js

Run k6 with the specified vus and duration:
k6 run --vus 10 --duration 30s script.js

Run following command to enable web dashboard:
K6_WEB_DASHBOARD=true k6 run script.js

You can reach the dasboard on:
http://127.0.0.1:5665
 */
