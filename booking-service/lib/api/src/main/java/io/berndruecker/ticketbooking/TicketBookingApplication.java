package io.berndruecker.ticketbooking;

import io.camunda.zeebe.spring.client.annotation.Deployment;
import software.amazon.awssdk.http.async.SdkAsyncHttpClient;
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

import io.camunda.zeebe.spring.client.EnableZeebeClient;

@SpringBootApplication
@EnableZeebeClient
@Deployment(resources = { "classpath:ticket-booking.bpmn" })
public class TicketBookingApplication {


  public static void main(String[] args) {
    System.out.println("running 1");
    SpringApplication.run(TicketBookingApplication.class, args);
  }

  @Bean
  public RestTemplate restTemplate() {
    return new RestTemplate();
  }

  @Bean
  public SqsAsyncClient sqsAsyncClient(@Value("${aws.region:eu-central-1}") String awsRegion) {
    SdkAsyncHttpClient asyncHttpClient = NettyNioAsyncHttpClient.builder().build();

    return SqsAsyncClient.builder()
            .region(Region.of(awsRegion))
            .httpClient(asyncHttpClient)
            .build();
  }
}
