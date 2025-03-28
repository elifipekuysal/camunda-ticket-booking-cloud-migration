package io.berndruecker.ticketbooking;

import io.camunda.zeebe.spring.client.annotation.Deployment;

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
}
