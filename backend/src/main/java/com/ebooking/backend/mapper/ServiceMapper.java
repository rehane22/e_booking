package com.ebooking.backend.mapper;

import com.ebooking.backend.dto.service.ServiceResponse;
import com.ebooking.backend.model.ServiceCatalog;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ServiceMapper {
    ServiceResponse toResponse(ServiceCatalog entity);

    // update « in place » (utile pour PUT)
    void updateEntityFromRequest(com.ebooking.backend.dto.service.ServiceRequest req,
                                 @MappingTarget ServiceCatalog entity);
}
