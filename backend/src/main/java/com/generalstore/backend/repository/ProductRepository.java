package com.generalstore.backend.repository;

import com.generalstore.backend.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

// JpaRepository gives us free database methods like .findAll(), .save(), and .delete()
public interface ProductRepository extends JpaRepository<Product, Long> {
}