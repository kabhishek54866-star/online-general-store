package com.generalstore.backend.repository;

import com.generalstore.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Find orders by customer phone number for order tracking
    List<Order> findByContactNumber(String contactNumber);
}