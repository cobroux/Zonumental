package fr.zonumental.commun;

import io.swagger.v3.oas.models.responses.ApiResponse;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** La santé vient d'actuator : on lui donne l'operationId et le tag du contrat. */
@Configuration
class ContratOpenApiConfig {

  @Bean
  OpenApiCustomizer santeConforme() {
    return api -> {
      var get = api.getPaths().get("/api/health").getGet();
      get.setOperationId("sante");
      get.setTags(List.of("sante"));
      get.getResponses()
          .addApiResponse("503", new ApiResponse().description("Application indisponible"));
      get.setSecurity(List.of());
    };
  }
}
