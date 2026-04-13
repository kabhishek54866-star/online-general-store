package com.generalstore.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerName;
    private String contactNumber;
    private String address;
    private String paymentMode;      // "Cash on Delivery", "UPI", "Card"
    
    @Column(length = 2000)
    private String items;            // List of products bought
    
    private Double totalAmount;
    private String status;           // "Pending", "Order Received", "Packed", "Out for Delivery", "Delivered"
    private String billNumber;
    private String orderDate;
    private String paymentStatus;    // "Paid", "Unpaid"
    private String deliveryBoy;      // Assigned delivery person

    // Default Constructor
    public Order() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public String getItems() { return items; }
    public void setItems(String items) { this.items = items; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public String getOrderDate() { return orderDate; }
    public void setOrderDate(String orderDate) { this.orderDate = orderDate; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getDeliveryBoy() { return deliveryBoy; }
    public void setDeliveryBoy(String deliveryBoy) { this.deliveryBoy = deliveryBoy; }
}