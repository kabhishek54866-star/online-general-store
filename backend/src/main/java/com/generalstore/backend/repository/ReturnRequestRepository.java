package com.generalstore.backend.repository;

import com.generalstore.backend.model.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    List<ReturnRequest> findByCustomerPhone(String customerPhone);
    List<ReturnRequest> findByOrderId(Long orderId);
}
