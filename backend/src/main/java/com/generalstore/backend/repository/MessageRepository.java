package com.generalstore.backend.repository;

import com.generalstore.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByCustomerPhoneOrderByIdAsc(String customerPhone);
    List<Message> findBySenderTypeAndIsRead(String senderType, Boolean isRead);
}
