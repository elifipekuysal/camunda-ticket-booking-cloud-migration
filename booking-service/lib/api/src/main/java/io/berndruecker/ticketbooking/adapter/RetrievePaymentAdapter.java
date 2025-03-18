package io.berndruecker.ticketbooking.adapter;

import io.berndruecker.ticketbooking.ProcessConstants;
import io.camunda.zeebe.client.api.response.ActivatedJob;
import io.camunda.zeebe.spring.client.annotation.JobWorker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Component
public class RetrievePaymentAdapter {

  Logger logger = LoggerFactory.getLogger(RetrievePaymentAdapter.class);

  @Value("${ticketbooking.paymentreceiver.lambda.endpoint}")
  private String endpoint;

  @Autowired
  private RestTemplate restTemplate;

  @JobWorker(type = "retrieve-payment")
  public Map<String, Object> callPaymentReceiverRestService(final ActivatedJob job) throws IOException {
    logger.info("Receive payment via REST [" + job + "]");

    if ("payment"
        .equalsIgnoreCase((String) job.getVariablesAsMap().get(ProcessConstants.VAR_SIMULATE_BOOKING_FAILURE))) {
      throw new IOException("[Simulated] Could not connect to HTTP server");
    } else {
      String paymentRequestId = UUID.randomUUID().toString();

      PaymentResponseMessage paymentResponse = restTemplate
          .getForObject(String.format("%s?paymentRequestId=%s", endpoint, paymentRequestId),
              PaymentResponseMessage.class);

      logger.info("RetrievePaymentAdapter - Succeeded with " + paymentResponse.paymentConfirmationId);

      return Collections.singletonMap(ProcessConstants.VAR_PAYMENT_CONFIRMATION_ID,
          paymentResponse.paymentConfirmationId);
    }
  }

  public static class PaymentResponseMessage {
    public String paymentRequestId;
    public String paymentConfirmationId;

    @Override
    public String toString() {
      return "PaymentResponseMessage [paymentRequestId=" + paymentRequestId + ", paymentConfirmationId="
          + paymentConfirmationId + "]";
    }
  }
}
