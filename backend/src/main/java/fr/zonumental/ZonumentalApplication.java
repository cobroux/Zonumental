package fr.zonumental;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ZonumentalApplication {

  public static void main(String[] args) {
    SpringApplication.run(ZonumentalApplication.class, args);
  }
}
