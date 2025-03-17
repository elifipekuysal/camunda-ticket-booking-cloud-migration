package io.berndruecker.ticketbooking.adapter;

import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;

import io.camunda.zeebe.client.ZeebeClient;

@Component
public class PaymentSqsReceiver {

  private final Logger logger = LoggerFactory.getLogger(PaymentSqsReceiver.class);

  private final ZeebeClient client;
  private final ObjectMapper objectMapper;
  private final SqsClient sqsClient;

  @Value("${aws.sqs.paymentResponseQueueUrl}")
  private String paymentResponseQueueUrl;

  public PaymentSqsReceiver(@Qualifier("zeebeClientLifecycle") ZeebeClient client, ObjectMapper objectMapper, SqsClient sqsClient) {
    this.client = client;
    this.objectMapper = objectMapper;
    this.sqsClient = sqsClient;
  }

  @Scheduled(fixedRate = 1000)
  @Transactional
  public void pollSqsMessages() {
    ReceiveMessageRequest receiveMessageRequest = ReceiveMessageRequest.builder()
            .queueUrl(paymentResponseQueueUrl)
            .maxNumberOfMessages(4)
            .waitTimeSeconds(1)
            .build();

    List<Message> messages = sqsClient.receiveMessage(receiveMessageRequest).messages();

    for (Message message : messages) {
      try {
        logger.info("PaymentSqsReceiver - Received: " + message.body());

        PaymentResponseMessage paymentResponse = objectMapper.readValue(message.body(), PaymentResponseMessage.class);

        client.newPublishMessageCommand()
        .messageName("msg-payment-received")
        .correlationKey(paymentResponse.paymentRequestId)
        .variables(Collections.singletonMap("paymentConfirmationId", paymentResponse.paymentConfirmationId))
        .send().join();

        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(paymentResponseQueueUrl)
                .receiptHandle(message.receiptHandle())
                .build());
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
      return "PaymentResponseMessage [paymentRequestId=" + paymentRequestId + ", paymentConfirmationId=" + paymentConfirmationId + "]";
    }
  }
}
