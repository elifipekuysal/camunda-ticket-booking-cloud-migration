package io.berndruecker.ticketbooking.adapter;

import java.util.Collections;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import software.amazon.awssdk.services.sqs.SqsClient;
import io.awspring.cloud.messaging.listener.SqsMessageDeletionPolicy;
import io.awspring.cloud.messaging.listener.annotation.SqsListener;
import io.camunda.zeebe.client.ZeebeClient;

@Component
public class PaymentSqsReceiver {

  private final Logger logger = LoggerFactory.getLogger(PaymentSqsReceiver.class);

  private final ZeebeClient client;
  private final ObjectMapper objectMapper;

  public PaymentSqsReceiver(@Qualifier("zeebeClientLifecycle") ZeebeClient client, ObjectMapper objectMapper, SqsClient sqsClient) {
    this.client = client;
    this.objectMapper = objectMapper;
  }
  
  @SqsListener(value = "${aws.sqs.paymentResponseQueueUrl}", deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
  @Transactional
  public void receiveMessage(String message) {
    logger.info("PaymentSqsReceiver - Received message: " + message);
    
    try {
      PaymentResponseMessage paymentResponse = objectMapper.readValue(message, PaymentResponseMessage.class);

      client.newPublishMessageCommand()
              .messageName("msg-payment-received")
              .correlationKey(paymentResponse.paymentRequestId)
              .variables(Collections.singletonMap("paymentConfirmationId", paymentResponse.paymentConfirmationId))
              .send()
              .join();
    } catch (Exception e) {
      logger.error("Error processing SQS message", e);
    }
  }

  public static class PaymentResponseMessage {
    public String paymentRequestId;
    public String paymentConfirmationId;

    @Override
    public String toString() {
      return "PaymentResponseMessage [paymentRequestId=" + paymentRequestId + ", paymentConfirmationId=" + paymentConfirmationId + "]";
    }
  }
}
