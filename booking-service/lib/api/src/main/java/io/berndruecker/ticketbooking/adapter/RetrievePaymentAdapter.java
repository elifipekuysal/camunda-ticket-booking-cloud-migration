package io.berndruecker.ticketbooking.adapter;

import io.berndruecker.ticketbooking.ProcessConstants;
import io.camunda.zeebe.client.api.response.ActivatedJob;
import io.camunda.zeebe.spring.client.annotation.JobWorker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Component
public class RetrievePaymentAdapter {

    private Logger logger = LoggerFactory.getLogger(RetrievePaymentAdapter.class);

    @Value("${aws.sqs.paymentRequestQueueUrl}")
    private String paymentRequestQueueUrl;

    @Autowired
    private SqsClient sqsClient;


    @JobWorker(type = "retrieve-payment")
    public Map<String, Object> retrievePayment(final ActivatedJob job) {
        logger.info("Sending message to retrieve payment: " + job);

        String paymentRequestId = UUID.randomUUID().toString();

        SendMessageRequest sendMessageRequest = SendMessageRequest.builder()
                .queueUrl(paymentRequestQueueUrl)
                .messageBody("{\"paymentRequestId\": \"" + paymentRequestId + "\"}")
                .build();

        sqsClient.sendMessage(sendMessageRequest);
        logger.info("Sent payment request to SQS: " + paymentRequestId);

        return Collections.singletonMap(ProcessConstants.VAR_PAYMENT_REQUEST_ID, paymentRequestId);
    }
}
