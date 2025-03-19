import http from 'k6/http';
import { check } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
// "htmlReport" helper to generate an HTML report
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

/*
  Set LOAD_TYPE in your environment before running k6:
    e.g. LOAD_TYPE=medium k6 run script.js

  Valid LOAD_TYPE values: low, medium, high
  - low:    50 concurrent VUs
  - medium: 200 concurrent VUs
  - high:   1000 concurrent VUs
*/

const LOAD_TYPE = __ENV.LOAD_TYPE || 'low';

// Return an options object for the requested concurrency level
function getLoadOptions() {
    if (LOAD_TYPE === 'low') {
        return {
            scenarios: {
                low_traffic: {
                    executor: 'constant-vus',
                    vus: 50,              // 50 concurrent VUs
                    duration: '30s',      // for 30 seconds 
                    gracefulStop: '5s',
                },
            },
        };
    } else if (LOAD_TYPE === 'medium') {
        return {
            scenarios: {
                medium_traffic: {
                    executor: 'constant-vus',
                    vus: 200,             // 200 concurrent VUs
                    duration: '30s',      // for 30 seconds
                    gracefulStop: '5s',
                },
            },
        };
    } else if (LOAD_TYPE === 'high') {
        return {
            scenarios: {
                high_traffic: {
                    executor: 'constant-vus',
                    vus: 1000,            // 1000 concurrent VUs
                    duration: '30s',      // for 30 seconds 
                    gracefulStop: '5s',
                },
            },
        };
    } else {
        throw new Error(`Unsupported LOAD_TYPE "${LOAD_TYPE}". Use "low", "medium", or "high".`);
    }
}

// Export scenario options based on LOAD_TYPE
export const options = getLoadOptions();

export default function () {
    //   const res = http.put('http://ticketbooking-alb-464838447.eu-central-1.elb.amazonaws.com:8080/ticket');
    const res = http.put('http://ticket-booking-alb-670218667.eu-central-1.elb.amazonaws.com/ticket?simulateBookingFailure=none');


    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 3000ms': (r) => r.timings.duration < 3000,
    });
}

// Create a custom summary at the end of the test
export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'loadtest-report.html': htmlReport(data), // Generates an HTML report file
    };
}
