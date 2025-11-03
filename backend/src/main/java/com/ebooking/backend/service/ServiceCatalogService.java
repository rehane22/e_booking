package com.ebooking.backend.service;

import com.ebooking.backend.dto.service.ServiceRequest;
import com.ebooking.backend.dto.service.ServiceResponse;

import java.util.List;

public interface ServiceCatalogService {
    List<ServiceResponse> findAll();
    ServiceResponse create(ServiceRequest req);
    ServiceResponse update(Long id, ServiceRequest req);
    void delete(Long id);
}
