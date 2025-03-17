package io.berndruecker.ticketbooking.adapter;

import java.util.Collections;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.aws.messaging.listener.annotation.SqsListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.sqs.SqsClient;

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

  @SqsListener("${aws.sqs.paymentResponseQueueUrl}")
  @Transactional
  public void receiveMessage(String paymentResponseString) throws JsonMappingException, JsonProcessingException {
    PaymentResponseMessage paymentResponse = objectMapper.readValue(paymentResponseString, PaymentResponseMessage.class);
    logger.info("Received " + paymentResponse);
    
    client.newPublishMessageCommand()
        .messageName("msg-payment-received")
        .correlationKey(paymentResponse.paymentRequestId)
        .variables(Collections.singletonMap("paymentConfirmationId", paymentResponse.paymentConfirmationId))
        .send()
        .join();
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
