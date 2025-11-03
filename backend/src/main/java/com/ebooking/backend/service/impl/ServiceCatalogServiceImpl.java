package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.service.ServiceRequest;
import com.ebooking.backend.dto.service.ServiceResponse;
import com.ebooking.backend.mapper.ServiceMapper;
import com.ebooking.backend.model.ServiceCatalog;
import com.ebooking.backend.repository.ServiceRepository;
import com.ebooking.backend.service.ServiceCatalogService;
import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ServiceCatalogServiceImpl implements ServiceCatalogService {

    private final ServiceRepository repo;
    private final ServiceMapper mapper;

    @Transactional(readOnly = true)
    @Override
    public List<ServiceResponse> findAll() {
        return repo.findAll().stream().map(mapper::toResponse).toList();
    }

    @Override
    public ServiceResponse create(ServiceRequest req) {
        String nom = req.nom().trim();
        if (repo.existsByNomIgnoreCase(nom)) {
            throw new EntityExistsException("Nom de service déjà utilisé");
        }
        ServiceCatalog entity = ServiceCatalog.builder()
                .nom(nom)
                .description(req.description())
                .build();
        entity = repo.save(entity);
        return mapper.toResponse(entity);
    }

    @Override
    public ServiceResponse update(Long id, ServiceRequest req) {
        ServiceCatalog entity = repo.findById(id).orElseThrow(
                () -> new EntityNotFoundException("Service introuvable")
        );
        String nom = req.nom().trim();
        if (repo.existsByNomIgnoreCaseAndIdNot(nom, id)) {
            throw new EntityExistsException("Nom de service déjà utilisé");
        }
        // maj champs
        entity.setNom(nom);
        entity.setDescription(req.description());
        return mapper.toResponse(entity);
    }

    @Override
    public void delete(Long id) {
        ServiceCatalog entity = repo.findById(id).orElseThrow(
                () -> new EntityNotFoundException("Service introuvable")
        );
        repo.delete(entity);
    }
}
