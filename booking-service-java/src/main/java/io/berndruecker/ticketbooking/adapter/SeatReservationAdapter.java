package io.berndruecker.ticketbooking.adapter;

import io.berndruecker.ticketbooking.ProcessConstants;
import io.camunda.zeebe.client.api.response.ActivatedJob;
import io.camunda.zeebe.spring.client.annotation.JobWorker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

@Component
public class SeatReservationAdapter {

  Logger logger = LoggerFactory.getLogger(SeatReservationAdapter.class);

  // This should be of course injected and depends on the environment.
  // Hard coded for simplicity here
  public static String ENDPOINT = "https://z3wcvrfje8.execute-api.eu-central-1.amazonaws.com/v1/seat-reservation";

  @Autowired
  private RestTemplate restTemplate;

  @JobWorker(type = "reserve-seats")
  public Map<String, Object> callSeatReservationRestService(final ActivatedJob job) throws IOException {
    logger.info("Reserve seats via REST [" + job + "]");

    if ("seats".equalsIgnoreCase((String) job.getVariablesAsMap().get(ProcessConstants.VAR_SIMULATE_BOOKING_FAILURE))) {

      // Simulate a network problem to the HTTP server
      throw new IOException("[Simulated] Could not connect to HTTP server");

    } else {

      // Call REST API, simply returns a reservationId
      SeatReservationResponse reservation = restTemplate.getForObject(ENDPOINT, SeatReservationResponse.class);
      logger.info("Succeeded with " + reservation);

      return Collections.singletonMap(ProcessConstants.VAR_RESERVATION_ID, reservation.reservationId);
    }
  }

  public static class SeatReservationResponse {
    public String reservationId;
  }
}
