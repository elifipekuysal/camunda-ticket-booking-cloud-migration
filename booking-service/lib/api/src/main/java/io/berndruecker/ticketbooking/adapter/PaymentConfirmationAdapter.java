package io.berndruecker.ticketbooking.adapter;

import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.awspring.cloud.sqs.annotation.SqsListener;
import io.camunda.zeebe.client.ZeebeClient;

@Component
public class PaymentConfirmationAdapter {

  private final Logger logger = LoggerFactory.getLogger(PaymentConfirmationAdapter.class);

  private final ZeebeClient client;
  private final ObjectMapper objectMapper;

  public PaymentConfirmationAdapter(@Qualifier("zeebeClientLifecycle") ZeebeClient client, ObjectMapper objectMapper) {
    this.client = client;
    this.objectMapper = objectMapper;
  }

  @SqsListener(value = "${aws.sqs.paymentResponseQueueUrl}")
  public void receiveMessage(List<String> messages) throws InterruptedException {
    for (String message : messages) {
      logger.info("PaymentSqsReceiver - Received message: " + message);

      try {
        PaymentResponseMessage paymentResponse = objectMapper.readValue(message, PaymentResponseMessage.class);
        logger.info("PaymentSqsReceiver - paymentResponse: " + paymentResponse);

        client.newPublishMessageCommand()
            .messageName("msg-payment-received")
            .correlationKey(paymentResponse.paymentRequestId)
            .variables(Collections.singletonMap("paymentConfirmationId", paymentResponse.paymentConfirmationId))
            .send()
            .join();

        logger.info("PaymentSqsReceiver - Succeeded with " + paymentResponse.paymentConfirmationId);
      } catch (Exception e) {
        logger.error("Error processing SQS message", e);
      }
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
