package com.generalstore.backend.controller;

import com.generalstore.backend.model.Message;
import com.generalstore.backend.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    // Get all messages for a conversation (by customer phone)
    @GetMapping("/{customerPhone}")
    public List<Message> getConversation(@PathVariable String customerPhone) {
        return messageRepository.findByCustomerPhoneOrderByIdAsc(customerPhone);
    }

    // Send a message
    @PostMapping
    public Message sendMessage(@RequestBody Message message) {
        if (message.getTimestamp() == null) {
            message.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
        }
        if (message.getIsRead() == null) message.setIsRead(false);
        return messageRepository.save(message);
    }

    // Mark messages as read (when admin opens a chat or customer opens their chat)
    @PutMapping("/read/{customerPhone}")
    public void markAsRead(@PathVariable String customerPhone, @RequestParam String readerType) {
        List<Message> messages = messageRepository.findByCustomerPhoneOrderByIdAsc(customerPhone);
        for (Message msg : messages) {
            // Mark messages from the OTHER party as read
            if (!msg.getSenderType().equalsIgnoreCase(readerType) && !msg.getIsRead()) {
                msg.setIsRead(true);
                messageRepository.save(msg);
            }
        }
    }

    // Get all unique conversations (for admin inbox)
    @GetMapping("/conversations")
    public List<Map<String, Object>> getAllConversations() {
        List<Message> allMessages = messageRepository.findAll();

        // Group by customerPhone
        Map<String, List<Message>> grouped = allMessages.stream()
                .collect(Collectors.groupingBy(Message::getCustomerPhone));

        List<Map<String, Object>> conversations = new ArrayList<>();
        for (Map.Entry<String, List<Message>> entry : grouped.entrySet()) {
            List<Message> msgs = entry.getValue();
            msgs.sort(Comparator.comparingLong(Message::getId));

            Message lastMsg = msgs.get(msgs.size() - 1);
            long unreadCount = msgs.stream()
                    .filter(m -> "CUSTOMER".equalsIgnoreCase(m.getSenderType()) && !m.getIsRead())
                    .count();

            // Get customer name from the first customer message
            String customerName = msgs.stream()
                    .filter(m -> "CUSTOMER".equalsIgnoreCase(m.getSenderType()))
                    .map(Message::getSenderName)
                    .findFirst()
                    .orElse("Customer");

            Map<String, Object> convo = new HashMap<>();
            convo.put("customerPhone", entry.getKey());
            convo.put("customerName", customerName);
            convo.put("lastMessage", lastMsg.getContent());
            convo.put("lastTimestamp", lastMsg.getTimestamp());
            convo.put("unreadCount", unreadCount);
            convo.put("totalMessages", msgs.size());
            conversations.add(convo);
        }

        // Sort by most recent
        conversations.sort((a, b) -> ((String)b.get("lastTimestamp")).compareTo((String)a.get("lastTimestamp")));
        return conversations;
    }

    // Get unread count for admin
    @GetMapping("/unread-count")
    public Map<String, Object> getUnreadCount() {
        long count = messageRepository.findBySenderTypeAndIsRead("CUSTOMER", false).size();
        Map<String, Object> result = new HashMap<>();
        result.put("count", count);
        return result;
    }
}
